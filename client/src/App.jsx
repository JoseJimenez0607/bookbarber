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
import CancelPage from "./pages/public/CancelPage"          // ← NUEVO
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
        {/* Rutas públicas */}
        <Route path="/b/:slug" element={<BookingPage />} />
        <Route path="/b/:slug/confirmacion/:token" element={<Confirmation />} />
        <Route path="/b/:slug/cancelar/:token" element={<CancelPage />} />  {/* ← NUEVO */}

        {/* Admin */}
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
