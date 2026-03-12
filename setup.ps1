# ============================================
# BookBarber - Script de setup completo
# Ejecutar desde: C:\Users\Jose\Desktop\files\bookbarber
# ============================================

# Mover app.js al lugar correcto
if (Test-Path "app.js") {
    Move-Item "app.js" "server\src\app.js" -Force
    Write-Host "✅ app.js movido" -ForegroundColor Green
}

# ============================================
# ARCHIVOS RAIZ
# ============================================
@'
{
  "name": "bookbarber",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "npm --prefix client run dev",
    "dev:server": "npm --prefix server run dev",
    "install:all": "npm install && npm --prefix client install && npm --prefix server install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
'@ | Set-Content "package.json"
Write-Host "✅ package.json raiz creado" -ForegroundColor Green

# ============================================
# CLIENT
# ============================================
@'
{
  "name": "bookbarber-client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "axios": "^1.6.7",
    "zustand": "^4.5.0",
    "date-fns": "^3.3.1",
    "@supabase/supabase-js": "^2.39.7",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.321.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.0",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35"
  }
}
'@ | Set-Content "client\package.json"
Write-Host "✅ client/package.json creado" -ForegroundColor Green

@'
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      }
    }
  }
})
'@ | Set-Content "client\vite.config.js"

@'
/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#fdf4e7",
          100: "#fae3c0",
          400: "#f2ae34",
          500: "#c97f0a",
          600: "#a0630a",
          700: "#7a4c0b",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
}
'@ | Set-Content "client\tailwind.config.js"

@'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
'@ | Set-Content "client\postcss.config.js"

@'
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BookBarber</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
'@ | Set-Content "client\index.html"

Write-Host "✅ Archivos config cliente creados" -ForegroundColor Green

# CSS
@'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-secondary {
    @apply bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-300 transition-colors duration-200;
  }
  .input-base {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200;
  }
  .card {
    @apply bg-white rounded-xl shadow-sm border border-gray-100 p-6;
  }
}
'@ | Set-Content "client\src\index.css"

# main.jsx
@'
import React from "react"
import ReactDOM from "react-dom/client"
import { Toaster } from "react-hot-toast"
import App from "./App.jsx"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
  </React.StrictMode>
)
'@ | Set-Content "client\src\main.jsx"

# App.jsx
@'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./store/authStore"
import Login from "./pages/admin/Login"
import Dashboard from "./pages/admin/Dashboard"
import Services from "./pages/admin/Services"
import Schedule from "./pages/admin/Schedule"
import Bookings from "./pages/admin/Bookings"
import Settings from "./pages/admin/Settings"
import BookingPage from "./pages/public/BookingPage"
import Confirmation from "./pages/public/Confirmation"
import AdminLayout from "./components/admin/AdminLayout"

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  return user ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/b/:slug" element={<BookingPage />} />
        <Route path="/b/:slug/confirmacion/:token" element={<Confirmation />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="servicios" element={<Services />} />
          <Route path="horarios" element={<Schedule />} />
          <Route path="reservas" element={<Bookings />} />
          <Route path="configuracion" element={<Settings />} />
        </Route>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
'@ | Set-Content "client\src\App.jsx"

Write-Host "✅ App.jsx y main.jsx creados" -ForegroundColor Green

# Supabase client
@'
import { createClient } from "@supabase/supabase-js"
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
'@ | Set-Content "client\src\services\supabase.js"

# API client
@'
import axios from "axios"
import { supabase } from "./supabase"

const api = axios.create({ baseURL: "/api", headers: { "Content-Type": "application/json" } })

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) config.headers.Authorization = `Bearer ${session.access_token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut()
      window.location.href = "/admin/login"
    }
    return Promise.reject(error)
  }
)

export default api
'@ | Set-Content "client\src\services\api.js"

# Auth store
@'
import { create } from "zustand"
import { supabase } from "../services/supabase"

export const useAuthStore = create((set) => ({
  user: null,
  business: null,
  loading: true,
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, loading: false })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },
  setBusiness: (business) => set({ business }),
  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, business: null })
  }
}))
'@ | Set-Content "client\src\store\authStore.js"

Write-Host "✅ Services y store creados" -ForegroundColor Green

# Paginas admin placeholder
@'
export default function Dashboard() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-gray-800">Dashboard</h1><p className="text-gray-500 mt-2">En construccion...</p></div>
}
'@ | Set-Content "client\src\pages\admin\Dashboard.jsx"

@'
export default function Services() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-gray-800">Servicios</h1><p className="text-gray-500 mt-2">En construccion...</p></div>
}
'@ | Set-Content "client\src\pages\admin\Services.jsx"

@'
export default function Schedule() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-gray-800">Horarios</h1><p className="text-gray-500 mt-2">En construccion...</p></div>
}
'@ | Set-Content "client\src\pages\admin\Schedule.jsx"

@'
export default function Bookings() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-gray-800">Reservas</h1><p className="text-gray-500 mt-2">En construccion...</p></div>
}
'@ | Set-Content "client\src\pages\admin\Bookings.jsx"

@'
export default function Settings() {
  return <div className="p-6"><h1 className="text-2xl font-bold text-gray-800">Configuracion</h1><p className="text-gray-500 mt-2">En construccion...</p></div>
}
'@ | Set-Content "client\src\pages\admin\Settings.jsx"

@'
export default function BookingPage() {
  return <div className="min-h-screen flex items-center justify-center"><p>Pagina publica de reservas</p></div>
}
'@ | Set-Content "client\src\pages\public\BookingPage.jsx"

@'
export default function Confirmation() {
  return <div className="min-h-screen flex items-center justify-center"><p>Confirmacion de reserva</p></div>
}
'@ | Set-Content "client\src\pages\public\Confirmation.jsx"

Write-Host "✅ Paginas creadas" -ForegroundColor Green

# ============================================
# SERVER
# ============================================
@'
{
  "name": "bookbarber-server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "nodemon src/app.js",
    "start": "node src/app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.4",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "@supabase/supabase-js": "^2.39.7",
    "resend": "^3.1.0",
    "ical-generator": "^6.0.1",
    "uuid": "^9.0.0",
    "date-fns": "^3.3.1",
    "date-fns-tz": "^3.1.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  }
}
'@ | Set-Content "server\package.json"

# Supabase config server
@'
const { createClient } = require("@supabase/supabase-js")
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
module.exports = { supabase }
'@ | Set-Content "server\src\config\supabase.js"

# Auth middleware
@'
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
'@ | Set-Content "server\src\middleware\auth.middleware.js"

# Routes placeholder
$routes = @("auth", "services", "schedule", "bookings", "payments", "public")
foreach ($r in $routes) {
  @"
const express = require("express")
const router = express.Router()
router.get("/", (_req, res) => res.json({ message: "$r routes OK" }))
module.exports = router
"@ | Set-Content "server\src\routes\$r.routes.js"
}

# Business route
@'
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
'@ | Set-Content "server\src\routes\business.routes.js"

Write-Host "✅ Server routes creados" -ForegroundColor Green

# .gitignore
@'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
'@ | Set-Content ".gitignore"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETO - Verificando estructura..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Get-ChildItem -Recurse -Name | Where-Object { $_ -notlike "*node_modules*" }
Write-Host ""
Write-Host "Ahora corre: npm run install:all" -ForegroundColor Yellow
