const express = require("express")
const router = express.Router()
const { authMiddleware: requireAuth } = require("../middleware/auth.middleware")
const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ─── GET /api/bookings/cancel/:token ────────────────────────────────────────
// Público: obtiene info de la reserva por token (para mostrar en la página)
router.get("/cancel/:token", async (req, res) => {
  try {
    const { token } = req.params

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        id, client_name, client_email, booking_date, start_time, end_time,
        status, confirmation_token,
        services (name, price),
        businesses (name, slug)
      `)
      .eq("confirmation_token", token)
      .single()

    if (error || !booking) {
      return res.status(404).json({ error: "Reserva no encontrada." })
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Esta reserva ya fue cancelada." })
    }

    if (booking.status === "completed") {
      return res.status(400).json({ error: "No puedes cancelar una reserva completada." })
    }

    res.json({ booking })
  } catch (err) {
    res.status(500).json({ error: "Error al obtener la reserva." })
  }
})

// ─── POST /api/bookings/cancel/:token ───────────────────────────────────────
// Público: cancela la reserva por token
router.post("/cancel/:token", async (req, res) => {
  try {
    const { token } = req.params

    // Verificar que existe y no está ya cancelada
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status, client_email, client_name, booking_date, start_time, businesses(name)")
      .eq("confirmation_token", token)
      .single()

    if (fetchError || !booking) {
      return res.status(404).json({ error: "Reserva no encontrada." })
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Esta reserva ya fue cancelada." })
    }

    if (booking.status === "completed") {
      return res.status(400).json({ error: "No puedes cancelar una reserva completada." })
    }

    // Cancelar
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", booking.id)

    if (updateError) throw updateError

    // Log de notificación
    await supabase.from("notifications_log").insert({
      booking_id: booking.id,
      type: "cancellation",
      recipient: booking.client_email,
      status: "sent"
    })

    res.json({ message: "Reserva cancelada exitosamente." })
  } catch (err) {
    console.error("Error cancelando reserva:", err)
    res.status(500).json({ error: "Error al cancelar la reserva." })
  }
})

// ─── GET /api/bookings — Admin: listar reservas del negocio ─────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", req.user.id)
      .single()

    if (!business) return res.status(404).json({ error: "Negocio no encontrado." })

    const { status, date } = req.query

    let query = supabase
      .from("bookings")
      .select("*, services(name, price)")
      .eq("business_id", business.id)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: true })

    if (status) query = query.eq("status", status)
    if (date)   query = query.eq("booking_date", date)

    const { data: bookings, error } = await query
    if (error) throw error

    res.json({ bookings })
  } catch (err) {
    res.status(500).json({ error: "Error al obtener reservas." })
  }
})

// ─── PATCH /api/bookings/:id/status — Admin: cambiar estado ─────────────────
router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ["pending", "confirmed", "cancelled", "completed"]
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Estado inválido." })
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", req.user.id)
      .single()

    const { error } = await supabase
      .from("bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", business.id)

    if (error) throw error

    res.json({ message: "Estado actualizado." })
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar estado." })
  }
})

module.exports = router