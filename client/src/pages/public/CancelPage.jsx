import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Calendar, Clock, Scissors, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

export default function CancelPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError]       = useState("")
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    fetchBooking()
  }, [token])

  async function fetchBooking() {
    try {
      const res = await fetch(`${API}/bookings/cancel/${token}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setBooking(data.booking)
    } catch {
      setError("No se pudo conectar con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!confirm("¿Estás seguro que deseas cancelar esta reserva?")) return
    setCancelling(true)
    try {
      const res = await fetch(`${API}/bookings/cancel/${token}`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setCancelled(true)
    } catch {
      setError("Error al cancelar. Intenta nuevamente.")
    } finally {
      setCancelling(false)
    }
  }

  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split("-")
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  }

  function formatTime(timeStr) {
    return timeStr?.slice(0, 5)
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Cargando reserva...</p>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Reserva no disponible</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  // ── Cancelado exitosamente ──
  if (cancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Reserva cancelada</h2>
          <p className="text-gray-500 mb-6">
            Tu hora ha sido cancelada exitosamente. Si deseas reagendar, puedes hacerlo en cualquier momento.
          </p>
          {booking?.businesses?.slug && (
            <button
              onClick={() => navigate(`/b/${booking.businesses.slug}`)}
              className="w-full bg-gray-800 text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
            >
              Volver a agendar
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Vista principal ──
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Cancelar reserva</h1>
          <p className="text-gray-500 text-sm mt-1">{booking?.businesses?.name}</p>
        </div>

        {/* Detalles de la reserva */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <Scissors className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Servicio</p>
              <p className="font-semibold text-gray-800">{booking?.services?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Fecha</p>
              <p className="font-semibold text-gray-800 capitalize">{formatDate(booking?.booking_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Hora</p>
              <p className="font-semibold text-gray-800">
                {formatTime(booking?.start_time)} – {formatTime(booking?.end_time)}
              </p>
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div className="border border-gray-100 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Reserva a nombre de</p>
          <p className="font-semibold text-gray-800">{booking?.client_name}</p>
          <p className="text-sm text-gray-500">{booking?.client_email}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm mb-4 text-center">
            {error}
          </div>
        )}

        {/* Aviso */}
        <p className="text-sm text-gray-400 text-center mb-4">
          Esta acción no se puede deshacer. ¿Deseas continuar?
        </p>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Volver
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {cancelling ? "Cancelando..." : "Sí, cancelar"}
          </button>
        </div>
      </div>
    </div>
  )
}
