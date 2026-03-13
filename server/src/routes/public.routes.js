require("dotenv").config()
const express = require("express")
const router = express.Router()
const { supabase } = require("../config/supabase")
const { sendBookingNotificationToAdmin, sendBookingConfirmationToClient } = require("../services/email.service")

// GET /api/p/:slug — info pública del negocio
router.get("/:slug", async (req, res) => {
  try {
    const { data: business } = await supabase
      .from("businesses").select("id,name,slug,address,phone")
      .eq("slug", req.params.slug).eq("is_active", true).single()
    if (!business) return res.status(404).json({ error: "Negocio no encontrado" })

    const { data: services } = await supabase
      .from("services").select("*")
      .eq("business_id", business.id).eq("is_active", true)

    const { data: schedules } = await supabase
      .from("schedules").select("*")
      .eq("business_id", business.id).eq("is_active", true)

    res.json({ business, services, schedules })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/p/:slug/bookings — crear reserva (público)
router.post("/:slug/bookings", async (req, res) => {
  const { service_id, client_name, client_email, client_phone, booking_date, start_time, end_time, notes } = req.body

  if (!service_id || !client_name || !client_email || !booking_date || !start_time || !end_time) {
    return res.status(400).json({ error: "Faltan campos requeridos" })
  }

  try {
    // Obtener negocio
    const { data: business } = await supabase
      .from("businesses").select("*")
      .eq("slug", req.params.slug).eq("is_active", true).single()
    if (!business) return res.status(404).json({ error: "Negocio no encontrado" })

    // ✅ Verificar overlap correctamente: nueva reserva solapa si
    //    existing.start_time < nueva.end_time  AND  existing.end_time > nueva.start_time
    const { data: conflict } = await supabase
      .from("bookings")
      .select("id")
      .eq("business_id", business.id)
      .eq("booking_date", booking_date)
      .neq("status", "cancelled")
      .lt("start_time", end_time)
      .gt("end_time", start_time)

    if (conflict && conflict.length > 0) {
      return res.status(409).json({ error: "Este horario ya no está disponible" })
    }

    // Crear reserva
    const { data: booking, error } = await supabase
      .from("bookings").insert({
        business_id: business.id, service_id,
        client_name, client_email,
        client_phone: client_phone || null,
        booking_date, start_time, end_time,
        notes: notes || null,
        status: "confirmed"
      }).select().single()

    if (error) throw error

    // Obtener servicio para los emails
    const { data: service } = await supabase
      .from("services").select("*").eq("id", service_id).single()

    // Enviar emails (sin bloquear la respuesta)
    Promise.all([
      sendBookingNotificationToAdmin({ booking, service, business }),
      sendBookingConfirmationToClient({ booking, service, business })
    ]).catch(err => console.error("Error enviando emails:", err))

    res.status(201).json(booking)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/p/bookings/:token — cancelar reserva por token
router.delete("/bookings/:token", async (req, res) => {
  try {
    const { data: booking } = await supabase
      .from("bookings").select("*")
      .eq("confirmation_token", req.params.token).single()

    if (!booking) return res.status(404).json({ error: "Reserva no encontrada" })
    if (booking.status === "cancelled") return res.status(400).json({ error: "La reserva ya fue cancelada" })

    await supabase.from("bookings").update({ status: "cancelled", updated_at: new Date() })
      .eq("id", booking.id)

    res.json({ message: "Reserva cancelada correctamente" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router