require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const authRoutes     = require('./routes/auth.routes')
const businessRoutes = require('./routes/business.routes')
const servicesRoutes = require('./routes/services.routes')
const scheduleRoutes = require('./routes/schedule.routes')
const bookingsRoutes = require('./routes/bookings.routes')
const publicRoutes   = require('./routes/public.routes')
const paymentRoutes  = require('./routes/payments.routes')

const app = express()

// Seguridad
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Demasiadas solicitudes, intenta más tarde.' }
}))

// Rate limiting estricto para reservas públicas
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: { error: 'Límite de reservas alcanzado. Intenta en 1 hora.' }
})

app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }))

// Rutas
app.use('/api/auth',     authRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/services', servicesRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/p',        publicRoutes)
app.use('/api/payments', paymentRoutes)

// Manejo de errores global
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.message)
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`)
})

module.exports = app
