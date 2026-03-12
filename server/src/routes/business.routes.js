const express = require("express")
const router = express.Router()
const { authMiddleware } = require("../middleware/auth.middleware")
const { supabase } = require("../config/supabase")

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from("businesses").select("*").eq("user_id", req.user.id).single()
    if (error) return res.status(404).json({ error: "Negocio no encontrado" })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put("/me", authMiddleware, async (req, res) => {
  const { name, phone, address } = req.body
  try {
    const { data, error } = await supabase.from("businesses").update({ name, phone, address, updated_at: new Date() }).eq("user_id", req.user.id).select().single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
