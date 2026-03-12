const { createClient } = require("@supabase/supabase-js")
const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" })
  }
  const token = authHeader.split(" ")[1]
  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: "Token invalido" })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: "Error al verificar token" })
  }
}

module.exports = { authMiddleware }
