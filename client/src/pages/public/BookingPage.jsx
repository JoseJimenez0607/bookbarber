import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../../services/supabase"
import { format, addDays, startOfToday, getDay, isBefore, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import toast from "react-hot-toast"

const DAY_MAP = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0 }

function generateSlots(startTime, endTime, durationMin) {
  const slots = []
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em
  while (cur + durationMin <= end) {
    const h = String(Math.floor(cur / 60)).padStart(2, "0")
    const m = String(cur % 60).padStart(2, "0")
    slots.push(`${h}:${m}`)
    cur += durationMin
  }
  return slots
}

const fmt = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)

// ─── Scissor SVG decorativo ──────────────────────────────────────────────────
function ScissorIcon({ size = 24, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  )
}

// ─── Paso 1: Servicios ───────────────────────────────────────────────────────
function StepService({ services, onSelect }) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.2em] text-amber-400 uppercase mb-2">Paso 1 de 4</p>
        <h2 className="text-2xl font-black text-white leading-tight">¿Qué servicio<br/>necesitas hoy?</h2>
      </div>
      <div className="space-y-3">
        {services.map((s, i) => (
          <button key={s.id} onClick={() => onSelect(s)}
            className="w-full group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-amber-400/50 transition-all duration-300 text-left p-4"
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-4">
              {/* Color dot + icon */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: (s.color || "#f59e0b") + "25", border: `1px solid ${s.color || "#f59e0b"}40` }}>
                  <ScissorIcon size={20} className="transition-transform group-hover:rotate-12 duration-300"
                    style={{ color: s.color || "#f59e0b" }} />
                </div>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base">{s.name}</p>
                {s.description && <p className="text-xs text-white/50 mt-0.5 truncate">{s.description}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {s.duration_min} min
                  </span>
                  <span className="text-xs font-black text-amber-400">{fmt(s.price)}</span>
                </div>
              </div>
              {/* Arrow */}
              <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-amber-400 flex items-center justify-center transition-all duration-300 flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/30 group-hover:text-white transition-colors">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
            {/* Hover glow */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: `radial-gradient(circle at 20% 50%, ${s.color || "#f59e0b"}08 0%, transparent 70%)` }} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Paso 2: Fecha ───────────────────────────────────────────────────────────
function StepDate({ service, schedules, blockedSlots, onSelect, onBack }) {
  const today = startOfToday()
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  const weekDays = ["L","M","X","J","V","S","D"]

  function isDayAvailable(date) {
    if (isBefore(startOfDay(date), today)) return false
    const dow = DAY_MAP[getDay(date)]
    const hasSchedule = schedules.some(s => s.day_of_week === dow && s.is_active)
    if (!hasSchedule) return false
    const dateStr = format(date, "yyyy-MM-dd")
    return !blockedSlots.some(b => b.blocked_date === dateStr && b.all_day)
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Volver
      </button>
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[0.2em] text-amber-400 uppercase mb-2">Paso 2 de 4</p>
        <h2 className="text-2xl font-black text-white">¿Qué día<br/>te viene bien?</h2>
        <p className="text-white/40 text-sm mt-1 font-medium">{service.name} · {service.duration_min} min</p>
      </div>

      {/* Días semana header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => <div key={d} className="text-center text-xs font-bold text-white/30 py-1">{d}</div>)}
      </div>

      {/* Calendario 2 semanas */}
      <div className="grid grid-cols-7 gap-1">
        {/* Offset para empezar en el día correcto */}
        {Array.from({ length: DAY_MAP[getDay(today)] }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(date => {
          const available = isDayAvailable(date)
          const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
          return (
            <button key={date.toISOString()} onClick={() => available && onSelect(date)} disabled={!available}
              className={`aspect-square rounded-xl text-sm font-bold transition-all duration-200 flex flex-col items-center justify-center gap-0.5
                ${available
                  ? isToday
                    ? "bg-amber-400 text-gray-900 shadow-lg shadow-amber-400/30 hover:bg-amber-300"
                    : "bg-white/8 text-white hover:bg-amber-400 hover:text-gray-900 hover:shadow-lg hover:shadow-amber-400/20 border border-white/10"
                  : "text-white/15 cursor-not-allowed"
                }`}>
              <span>{format(date, "d")}</span>
              {isToday && <span className="text-[8px] font-bold leading-none opacity-70">HOY</span>}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mt-5 justify-center">
        <span className="flex items-center gap-1.5 text-xs text-white/30">
          <span className="w-3 h-3 rounded bg-white/8 border border-white/10 inline-block" />Disponible
        </span>
        <span className="flex items-center gap-1.5 text-xs text-white/30">
          <span className="w-3 h-3 rounded bg-amber-400 inline-block" />Hoy
        </span>
      </div>
    </div>
  )
}

// ─── Paso 3: Hora ────────────────────────────────────────────────────────────
function StepTime({ service, date, schedules, blockedSlots, existingBookings, onSelect, onBack }) {
  const dow = DAY_MAP[getDay(date)]
  const schedule = schedules.find(s => s.day_of_week === dow && s.is_active)
  const dateStr = format(date, "yyyy-MM-dd")
  const todayStr = format(startOfToday(), "yyyy-MM-dd")
  const allSlots = schedule ? generateSlots(schedule.start_time.slice(0,5), schedule.end_time.slice(0,5), service.duration_min) : []
 
  // ✅ FIX: si es hoy, ocultar horas que ya pasaron
  function isSlotPast(slot) {
    if (dateStr !== todayStr) return false
    const now = new Date()
    const [sh, sm] = slot.split(":").map(Number)
    return sh * 60 + sm <= now.getHours() * 60 + now.getMinutes()
  }
 
  function isSlotTaken(slot) {
    const [sh, sm] = slot.split(":").map(Number)
    const slotStart = sh * 60 + sm
    const slotEnd = slotStart + service.duration_min
    return existingBookings.some(b => {
      if (b.booking_date !== dateStr) return false
      const [bh, bm] = b.start_time.slice(0,5).split(":").map(Number)
      const [eh, em] = b.end_time.slice(0,5).split(":").map(Number)
      return slotStart < eh * 60 + em && slotEnd > bh * 60 + bm
    })
  }
 
  function isSlotBlocked(slot) {
    const [sh, sm] = slot.split(":").map(Number)
    const slotStart = sh * 60 + sm
    return blockedSlots.some(b => {
      if (b.blocked_date !== dateStr) return false
      if (b.all_day) return true
      const [bh, bm] = b.start_time.slice(0,5).split(":").map(Number)
      const [eh, em] = b.end_time.slice(0,5).split(":").map(Number)
      return slotStart >= bh * 60 + bm && slotStart < eh * 60 + em
    })
  }
 
  // ✅ FIX: filtrar slots pasados del listado directamente
  const visibleSlots = allSlots.filter(s => !isSlotPast(s))
 
  const morning   = visibleSlots.filter(s => parseInt(s) < 12)
  const afternoon = visibleSlots.filter(s => parseInt(s) >= 12 && parseInt(s) < 17)
  const evening   = visibleSlots.filter(s => parseInt(s) >= 17)
  const sections  = [["Mañana ☀️", morning], ["Tarde 🌤", afternoon], ["Noche 🌙", evening]].filter(([,slots]) => slots.length > 0)
  const availableCount = visibleSlots.filter(s => !isSlotTaken(s) && !isSlotBlocked(s)).length
 
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Volver
      </button>
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[0.2em] text-amber-400 uppercase mb-2">Paso 3 de 4</p>
        <h2 className="text-2xl font-black text-white">Elige tu<br/>horario</h2>
        <p className="text-white/40 text-sm mt-1 font-medium capitalize">
          {format(date, "EEEE d 'de' MMMM", { locale: es })}
          {availableCount > 0 && <span className="ml-2 text-amber-400">· {availableCount} disponibles</span>}
        </p>
      </div>
 
      {sections.length > 0 ? (
        <div className="space-y-5">
          {sections.map(([label, slots]) => (
            <div key={label}>
              <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">{label}</p>
              <div className="grid grid-cols-4 gap-2">
                {slots.map(slot => {
                  const taken = isSlotTaken(slot) || isSlotBlocked(slot)
                  return (
                    <button key={slot} onClick={() => !taken && onSelect(slot)} disabled={taken}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                        ${taken
                          ? "bg-white/3 text-white/15 cursor-not-allowed line-through"
                          : "bg-white/8 text-white border border-white/10 hover:bg-amber-400 hover:text-gray-900 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-400/20 hover:-translate-y-0.5"
                        }`}>
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-white/10 rounded-2xl">
          <p className="text-4xl mb-3">😔</p>
          <p className="text-white/50 font-medium">No hay horarios disponibles</p>
          <p className="text-white/30 text-sm mt-1">Prueba con otro día</p>
        </div>
      )}
    </div>
  )
}
// ─── Paso 4: Confirmar ───────────────────────────────────────────────────────
function StepConfirm({ service, date, time, onConfirm, onBack, loading }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const endTime = (() => {
    const [h, m] = time.split(":").map(Number)
    const end = h * 60 + m + service.duration_min
    return `${String(Math.floor(end/60)).padStart(2,"0")}:${String(end%60).padStart(2,"0")}`
  })()

  function handleSubmit() {
    if (!form.name.trim()) return toast.error("Tu nombre es requerido")
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error("Email inválido")
    onConfirm(form)
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Volver
      </button>
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[0.2em] text-amber-400 uppercase mb-2">Paso 4 de 4</p>
        <h2 className="text-2xl font-black text-white">Casi listo,<br/>tus datos</h2>
      </div>

      {/* Resumen */}
      <div className="relative rounded-2xl overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/20" />
        <div className="relative p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Servicio</span>
            <span className="font-bold text-white">{service.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Fecha</span>
            <span className="font-bold text-white capitalize">{format(date, "EEEE d MMM", { locale: es })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Horario</span>
            <span className="font-bold text-white">{time} – {endTime}</span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between">
            <span className="text-white/50 text-sm">Total</span>
            <span className="font-black text-amber-400 text-base">{fmt(service.price)}</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-3 mb-6">
        {[
          { key: "name",  placeholder: "Tu nombre completo *", type: "text",  icon: "👤" },
          { key: "email", placeholder: "Tu email *",           type: "email", icon: "✉️" },
          { key: "phone", placeholder: "Teléfono (opcional)",  type: "tel",   icon: "📱" },
        ].map(f => (
          <div key={f.key} className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">{f.icon}</span>
            <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full bg-white/90 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-all" />
          </div>
        ))}
        <textarea placeholder="Notas adicionales (opcional)" value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
          className="w-full bg-white/90 border border-white/20 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-all resize-none" />
      </div>

      <button onClick={handleSubmit} disabled={loading}
        className="w-full relative overflow-hidden py-4 rounded-2xl font-black text-gray-900 text-base transition-all duration-300 disabled:opacity-50"
        style={{ background: loading ? "#6b7280" : "linear-gradient(135deg, #fbbf24, #f59e0b)" }}>
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Reservando...</>
          ) : (
            <>✂️ Confirmar reserva</>
          )}
        </span>
      </button>
      <p className="text-center text-white/25 text-xs mt-3">Recibirás confirmación por email</p>
    </div>
  )
}

// ─── Paso 5: Éxito ───────────────────────────────────────────────────────────
function StepSuccess({ booking, service, business, onNew }) {
  const date = new Date(booking.booking_date + "T00:00:00")
  const [sh, sm] = booking.start_time.split(":").map(Number)
  const endMin = sh * 60 + sm + service.duration_min
  const endTime = `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`

  const googleCalUrl = new URL("https://calendar.google.com/calendar/render")
  googleCalUrl.searchParams.set("action", "TEMPLATE")
  googleCalUrl.searchParams.set("text", `${service.name} - ${business.name}`)
  googleCalUrl.searchParams.set("dates", `${booking.booking_date.replace(/-/g,"")}T${booking.start_time.replace(/:/g,"").slice(0,4)}00/${booking.booking_date.replace(/-/g,"")}T${endTime.replace(/:/g,"").slice(0,4)}00`)
  if (business.address) googleCalUrl.searchParams.set("location", business.address)

  return (
    <div className="text-center py-4">
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-400/40">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
      </div>

      <h2 className="text-2xl font-black text-white mb-1">¡Reserva lista!</h2>
      <p className="text-white/40 text-sm mb-6">Revisa tu email para los detalles</p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2.5 mb-6">
        {[
          ["✂️", "Servicio", service.name],
          ["📅", "Fecha", format(date, "EEEE d 'de' MMMM", { locale: es })],
          ["🕐", "Horario", `${booking.start_time.slice(0,5)} – ${endTime}`],
          ["💰", "Precio", fmt(service.price)],
        ].map(([icon, label, value]) => (
          <div key={label} className="flex justify-between items-center text-sm">
            <span className="text-white/40 flex items-center gap-2"><span>{icon}</span>{label}</span>
            <span className="font-bold text-white capitalize">{value}</span>
          </div>
        ))}
      </div>

      <a href={googleCalUrl.toString()} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold border border-white/15 text-white/70 hover:bg-white/8 hover:text-white transition-all mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4285f4" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Agregar a Google Calendar
      </a>

      <button onClick={onNew} className="w-full py-3 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors">
        Hacer otra reserva →
      </button>
    </div>
  )
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function BookingPage() {
  const { slug } = useParams()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [schedules, setSchedules] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [existingBookings, setExistingBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [completedBooking, setCompletedBooking] = useState(null)

  useEffect(() => { loadBusiness() }, [slug])

  async function loadBusiness() {
    const { data: biz } = await supabase.from("businesses").select("*").eq("slug", slug).eq("is_active", true).single()
    if (!biz) { setNotFound(true); setLoading(false); return }
    setBusiness(biz)
    const [{ data: svcs }, { data: scheds }, { data: blocked }] = await Promise.all([
      supabase.from("services").select("*").eq("business_id", biz.id).eq("is_active", true).order("created_at"),
      supabase.from("schedules").select("*").eq("business_id", biz.id).eq("is_active", true),
      supabase.from("blocked_slots").select("*").eq("business_id", biz.id).gte("blocked_date", format(startOfToday(), "yyyy-MM-dd")),
    ])
    setServices(svcs || [])
    setSchedules(scheds || [])
    setBlockedSlots(blocked || [])
    const { data: bookings } = await supabase.from("bookings").select("booking_date,start_time,end_time")
      .eq("business_id", biz.id).neq("status", "cancelled").gte("booking_date", format(startOfToday(), "yyyy-MM-dd"))
    setExistingBookings(bookings || [])
    setLoading(false)
  }

  async function handleConfirm(clientData) {
    setSubmitting(true)
    try {
      const [sh, sm] = selectedTime.split(":").map(Number)
      const endMin = sh * 60 + sm + selectedService.duration_min
      const endTime = `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`
      const res = await fetch(`/api/p/${slug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: selectedService.id,
          client_name: clientData.name,
          client_email: clientData.email,
          client_phone: clientData.phone || null,
          notes: clientData.notes || null,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          start_time: selectedTime,
          end_time: endTime,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear reserva")
      setCompletedBooking(data)
      setStep(5)
      toast.success("¡Reserva confirmada!")
    } catch (err) {
      toast.error(err.message || "Error al crear reserva")
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep(1); setSelectedService(null); setSelectedDate(null)
    setSelectedTime(null); setCompletedBooking(null); loadBusiness()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)" }}>
      <div className="text-center">
        <ScissorIcon size={40} className="text-amber-400 mx-auto mb-4 animate-spin" />
        <p className="text-white/40 text-sm">Cargando...</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)" }}>
      <ScissorIcon size={48} className="text-white/10 mx-auto mb-4" />
      <h1 className="text-xl font-black text-white/50 mb-2">Negocio no encontrado</h1>
      <p className="text-white/25 text-sm">El link no existe o fue desactivado</p>
    </div>
  )

  const progress = ((step - 1) / 4) * 100

  return (
    <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #111 100%)" }}>
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5" style={{ background: "radial-gradient(circle, #f59e0b, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-3" style={{ background: "radial-gradient(circle, #f59e0b, transparent 70%)", transform: "translate(-30%, 30%)" }} />
        {/* Patron de tijeras sutil */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23f59e0b' stroke-width='1'%3E%3Ccircle cx='15' cy='15' r='6'/%3E%3Ccircle cx='15' cy='45' r='6'/%3E%3Cline x1='48' y1='12' x2='24' y2='36'/%3E%3Cline x1='36' y1='36' x2='48' y2='48'/%3E%3Cline x1='24' y1='24' x2='30' y2='30'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px"
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-4 py-8">
        {/* Header */}
        <div className="w-full max-w-sm mb-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-2xl shadow-amber-400/20" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <ScissorIcon size={26} className="text-white" />
          </div>
          <h1 className="text-lg font-black text-white">{business?.name}</h1>
          {business?.address && <p className="text-white/30 text-xs mt-0.5">{business.address}</p>}
        </div>

        {/* Card principal */}
        <div className="w-full max-w-sm">
          {/* Progress bar */}
          {step < 5 && (
            <div className="flex gap-1.5 mb-5">
              {[1,2,3,4].map(s => (
                <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                  <div className={`h-full rounded-full transition-all duration-500 ${s <= step ? "bg-amber-400" : ""}`}
                    style={{ width: s <= step ? "100%" : "0%" }} />
                </div>
              ))}
            </div>
          )}

          {/* Contenido */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
            {step === 1 && services.length === 0 && (
              <div className="text-center py-12">
                <ScissorIcon size={40} className="text-white/10 mx-auto mb-4" />
                <p className="text-white/40 font-bold">Sin servicios disponibles</p>
              </div>
            )}
            {step === 1 && services.length > 0 && (
              <StepService services={services} onSelect={s => { setSelectedService(s); setStep(2) }} />
            )}
            {step === 2 && (
              <StepDate service={selectedService} schedules={schedules} blockedSlots={blockedSlots}
                onSelect={d => { setSelectedDate(d); setStep(3) }} onBack={() => setStep(1)} />
            )}
            {step === 3 && (
              <StepTime service={selectedService} date={selectedDate} schedules={schedules}
                blockedSlots={blockedSlots} existingBookings={existingBookings}
                onSelect={t => { setSelectedTime(t); setStep(4) }} onBack={() => setStep(2)} />
            )}
            {step === 4 && (
              <StepConfirm service={selectedService} date={selectedDate} time={selectedTime}
                onConfirm={handleConfirm} onBack={() => setStep(3)} loading={submitting} />
            )}
            {step === 5 && completedBooking && (
              <StepSuccess booking={completedBooking} service={selectedService} business={business} onNew={reset} />
            )}
          </div>

          <p className="text-center text-white/15 text-xs mt-4">Powered by BookBarber ✂️</p>
        </div>
      </div>
    </div>
  )
}