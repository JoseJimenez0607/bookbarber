import { useState, useEffect } from "react"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"
import {
  Calendar, Clock, User, Phone, Mail, Search,
  Filter, CheckCircle2, XCircle, RotateCcw,
  ChevronDown, Scissors, StickyNote, X
} from "lucide-react"
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import toast from "react-hot-toast"

const STATUS = {
  confirmed:  { label: "Confirmada",  color: "bg-green-100 text-green-700",  dot: "bg-green-500"  },
  pending:    { label: "Pendiente",   color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  completed:  { label: "Completada", color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"   },
  cancelled:  { label: "Cancelada",  color: "bg-red-100 text-red-600",      dot: "bg-red-400"    },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function BookingDetail({ booking, onClose, onStatusChange }) {
  const fmt = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)
  const date = new Date(booking.booking_date + "T00:00:00")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Detalle de reserva</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Info cliente */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">{booking.client_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600">{booking.client_email}</span>
          </div>
          {booking.client_phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400" />
              <span className="text-sm text-gray-600">{booking.client_phone}</span>
            </div>
          )}
        </div>

        {/* Info reserva */}
        <div className="space-y-3 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1.5"><Scissors size={13} />Servicio</span>
            <span className="font-semibold text-gray-800">{booking.services?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1.5"><Calendar size={13} />Fecha</span>
            <span className="font-semibold text-gray-800 capitalize">{format(date, "EEEE d 'de' MMMM", { locale: es })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1.5"><Clock size={13} />Horario</span>
            <span className="font-semibold text-gray-800">{booking.start_time?.slice(0,5)} - {booking.end_time?.slice(0,5)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Precio</span>
            <span className="font-bold text-green-700">{fmt(booking.services?.price || 0)}</span>
          </div>
          {booking.notes && (
            <div className="flex gap-2 text-sm pt-2 border-t border-gray-100">
              <StickyNote size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{booking.notes}</span>
            </div>
          )}
        </div>

        {/* Estado actual */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-xl">
          <span className="text-sm text-gray-500">Estado actual</span>
          <StatusBadge status={booking.status} />
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-3 gap-2">
          {booking.status !== "completed" && (
            <button onClick={() => onStatusChange(booking.id, "completed")}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
              <CheckCircle2 size={16} className="text-blue-500" />
              <span className="text-xs font-medium text-blue-600">Completar</span>
            </button>
          )}
          {booking.status !== "confirmed" && booking.status !== "completed" && (
            <button onClick={() => onStatusChange(booking.id, "confirmed")}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 transition-colors">
              <RotateCcw size={16} className="text-green-500" />
              <span className="text-xs font-medium text-green-600">Confirmar</span>
            </button>
          )}
          {booking.status !== "cancelled" && (
            <button onClick={() => onStatusChange(booking.id, "cancelled")}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
              <XCircle size={16} className="text-red-400" />
              <span className="text-xs font-medium text-red-500">Cancelar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Bookings() {
  const { user } = useAuthStore()
  const [business, setBusiness] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => { if (user) loadData() }, [user, currentMonth])

  async function loadData() {
    setLoading(true)
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", user.id).single()
    if (!biz) return setLoading(false)
    setBusiness(biz)

    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd")
    const end   = format(endOfMonth(currentMonth), "yyyy-MM-dd")

    const { data } = await supabase
      .from("bookings")
      .select("*, services(name, price, color)")
      .eq("business_id", biz.id)
      .gte("booking_date", start)
      .lte("booking_date", end)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: true })

    setBookings(data || [])
    setLoading(false)
  }

  async function handleStatusChange(id, newStatus) {
    try {
      const { error } = await supabase.from("bookings").update({ status: newStatus, updated_at: new Date() }).eq("id", id)
      if (error) throw error
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b))
      if (selectedBooking?.id === id) setSelectedBooking({ ...selectedBooking, status: newStatus })
      toast.success(`Reserva ${STATUS[newStatus]?.label.toLowerCase()}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = bookings.filter(b => {
    const matchSearch = !search ||
      b.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      b.services?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || b.status === filterStatus
    return matchSearch && matchStatus
  })

  const counts = {
    all: bookings.length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
    pending:   bookings.filter(b => b.status === "pending").length,
  }

  const fmt = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)
  const monthRevenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.services?.price || 0), 0)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{fmt(monthRevenue)} este mes</p>
        </div>
        {/* Navegación de mes */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-gray-400 hover:text-gray-600 p-1">
            <ChevronDown size={16} className="rotate-90" />
          </button>
          <span className="text-sm font-semibold text-gray-700 capitalize min-w-[120px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-gray-400 hover:text-gray-600 p-1">
            <ChevronDown size={16} className="-rotate-90" />
          </button>
        </div>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: "all",       label: "Todas"      },
          { key: "confirmed", label: "Confirmadas" },
          { key: "completed", label: "Completadas" },
          { key: "pending",   label: "Pendientes"  },
          { key: "cancelled", label: "Canceladas"  },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5
              ${filterStatus === f.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterStatus === f.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input-base pl-9 max-w-sm" placeholder="Buscar por cliente o servicio..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(b => {
            const date = new Date(b.booking_date + "T00:00:00")
            const isToday = b.booking_date === format(new Date(), "yyyy-MM-dd")
            return (
              <button key={b.id} onClick={() => setSelectedBooking(b)}
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 hover:border-amber-200 hover:shadow-sm transition-all text-left flex items-center gap-4">
                {/* Color strip del servicio */}
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: b.services?.color || "#f59e0b" }} />

                {/* Fecha */}
                <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 ${isToday ? "bg-amber-500 text-white" : "bg-gray-50"}`}>
                  <span className={`text-lg font-bold leading-none ${isToday ? "text-white" : "text-gray-800"}`}>
                    {format(date, "d")}
                  </span>
                  <span className={`text-xs uppercase ${isToday ? "text-amber-100" : "text-gray-400"}`}>
                    {format(date, "MMM", { locale: es })}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 truncate">{b.client_name}</p>
                    {isToday && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Hoy</span>}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{b.services?.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={11} />{b.start_time?.slice(0,5)} - {b.end_time?.slice(0,5)}
                    </span>
                    <span className="text-xs font-semibold text-green-600">{fmt(b.services?.price || 0)}</span>
                  </div>
                </div>

                <StatusBadge status={b.status} />
              </button>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl">
          <Calendar size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {search || filterStatus !== "all" ? "Sin resultados" : "Sin reservas este mes"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? `No hay reservas que coincidan con "${search}"` : "Las reservas aparecerán aquí cuando los clientes agenden"}
          </p>
        </div>
      )}

      {selectedBooking && (
        <BookingDetail
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={(id, status) => { handleStatusChange(id, status); setSelectedBooking(null) }}
        />
      )}
    </div>
  )
}