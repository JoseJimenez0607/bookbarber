import { useState, useEffect } from "react"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"
import { Clock, Save, Plus, Trash2, X, CalendarOff, ToggleLeft, ToggleRight, Info } from "lucide-react"
import toast from "react-hot-toast"
import { format, addDays, startOfToday } from "date-fns"
import { es } from "date-fns/locale"

const DAYS = [
  { id: 0, label: "Lunes",     short: "Lun" },
  { id: 1, label: "Martes",    short: "Mar" },
  { id: 2, label: "Miércoles", short: "Mié" },
  { id: 3, label: "Jueves",    short: "Jue" },
  { id: 4, label: "Viernes",   short: "Vie" },
  { id: 5, label: "Sábado",    short: "Sáb" },
  { id: 6, label: "Domingo",   short: "Dom" },
]

const TIME_OPTIONS = []
for (let h = 6; h <= 23; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = String(h).padStart(2, "0")
    const mm = String(m).padStart(2, "0")
    TIME_OPTIONS.push(`${hh}:${mm}`)
  }
}

function BlockModal({ businessId, onSave, onClose }) {
  const [form, setForm] = useState({ blocked_date: format(startOfToday(), "yyyy-MM-dd"), all_day: true, start_time: "09:00", end_time: "18:00", reason: "" })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.blocked_date) return toast.error("Selecciona una fecha")
    setSaving(true)
    try {
      const { error } = await supabase.from("blocked_slots").insert({
        business_id: businessId,
        blocked_date: form.blocked_date,
        all_day: form.all_day,
        start_time: form.all_day ? null : form.start_time,
        end_time: form.all_day ? null : form.end_time,
        reason: form.reason || null,
      })
      if (error) throw error
      toast.success("Día bloqueado")
      onSave()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Bloquear fecha</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Fecha</label>
            <input type="date" className="input-base" value={form.blocked_date}
              min={format(startOfToday(), "yyyy-MM-dd")}
              onChange={e => setForm({ ...form, blocked_date: e.target.value })} />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">Día completo</p>
              <p className="text-xs text-gray-400">Bloquea todo el día</p>
            </div>
            <button onClick={() => setForm({ ...form, all_day: !form.all_day })}>
              {form.all_day
                ? <ToggleRight size={32} className="text-amber-500" />
                : <ToggleLeft size={32} className="text-gray-300" />}
            </button>
          </div>

          {!form.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Desde</label>
                <select className="input-base" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Hasta</label>
                <select className="input-base" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Motivo (opcional)</label>
            <input className="input-base" placeholder="Ej: Vacaciones, Feriado..." value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? "Guardando..." : "Bloquear fecha"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Schedule() {
  const { user } = useAuthStore()
  const [business, setBusiness] = useState(null)
  const [schedules, setSchedules] = useState({})
  const [blockedSlots, setBlockedSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", user.id).single()
    if (!biz) return setLoading(false)
    setBusiness(biz)

    const { data: scheds } = await supabase.from("schedules").select("*").eq("business_id", biz.id)
    const map = {}
    DAYS.forEach(d => {
      const existing = scheds?.find(s => s.day_of_week === d.id)
      map[d.id] = existing
        ? { ...existing }
        : { day_of_week: d.id, start_time: "09:00", end_time: "20:00", is_active: false }
    })
    setSchedules(map)

    const today = format(startOfToday(), "yyyy-MM-dd")
    const { data: blocked } = await supabase.from("blocked_slots")
      .select("*").eq("business_id", biz.id)
      .gte("blocked_date", today)
      .order("blocked_date", { ascending: true })
    setBlockedSlots(blocked || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!business) return
    setSaving(true)
    try {
      for (const day of DAYS) {
        const s = schedules[day.id]
        if (s.id) {
          await supabase.from("schedules").update({
            start_time: s.start_time, end_time: s.end_time, is_active: s.is_active
          }).eq("id", s.id)
        } else if (s.is_active) {
          await supabase.from("schedules").insert({
            business_id: business.id, day_of_week: day.id,
            start_time: s.start_time, end_time: s.end_time, is_active: true
          })
        }
      }
      toast.success("Horarios guardados ✓")
      loadData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteBlock(id) {
    await supabase.from("blocked_slots").delete().eq("id", id)
    setBlockedSlots(blockedSlots.filter(b => b.id !== id))
    toast.success("Bloqueo eliminado")
  }

  function updateDay(dayId, field, value) {
    setSchedules(prev => ({ ...prev, [dayId]: { ...prev[dayId], [field]: value } }))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const activeDays = Object.values(schedules).filter(s => s.is_active).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">{activeDays} día{activeDays !== 1 ? "s" : ""} de atención configurado{activeDays !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* Horarios por día */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
        <div className="p-5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            <h2 className="font-bold text-gray-900">Días de atención</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Info size={12} /> Activa los días que atiendes y configura el horario de cada uno
          </p>
        </div>

        <div className="divide-y divide-gray-50">
          {DAYS.map(day => {
            const s = schedules[day.id]
            if (!s) return null
            return (
              <div key={day.id} className={`flex items-center gap-4 px-5 py-4 transition-colors ${s.is_active ? "bg-white" : "bg-gray-50/50"}`}>
                {/* Toggle + Día */}
                <div className="flex items-center gap-3 w-36 flex-shrink-0">
                  <button onClick={() => updateDay(day.id, "is_active", !s.is_active)}>
                    {s.is_active
                      ? <ToggleRight size={28} className="text-amber-500" />
                      : <ToggleLeft size={28} className="text-gray-300" />}
                  </button>
                  <span className={`text-sm font-semibold ${s.is_active ? "text-gray-800" : "text-gray-400"}`}>
                    {day.label}
                  </span>
                </div>

                {/* Horario */}
                {s.is_active ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      className="input-base text-sm py-1.5 max-w-[110px]"
                      value={s.start_time?.slice(0,5) || "09:00"}
                      onChange={e => updateDay(day.id, "start_time", e.target.value)}
                    >
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-gray-400 text-sm font-medium">→</span>
                    <select
                      className="input-base text-sm py-1.5 max-w-[110px]"
                      value={s.end_time?.slice(0,5) || "20:00"}
                      onChange={e => updateDay(day.id, "end_time", e.target.value)}
                    >
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-xs text-gray-400 ml-1">
                      {(() => {
                        const [sh, sm] = (s.start_time || "09:00").split(":").map(Number)
                        const [eh, em] = (s.end_time || "20:00").split(":").map(Number)
                        const diff = (eh * 60 + em) - (sh * 60 + sm)
                        return diff > 0 ? `${Math.floor(diff/60)}h${diff%60 > 0 ? ` ${diff%60}m` : ""}` : ""
                      })()}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-300 italic">No disponible</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Fechas bloqueadas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarOff size={18} className="text-red-400" />
              <h2 className="font-bold text-gray-900">Fechas bloqueadas</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">Días en que no atenderás (vacaciones, feriados, etc.)</p>
          </div>
          <button onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={15} /> Bloquear fecha
          </button>
        </div>

        {blockedSlots.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {blockedSlots.map(block => (
              <div key={block.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-red-500 leading-none">
                      {format(new Date(block.blocked_date + "T00:00:00"), "d")}
                    </span>
                    <span className="text-xs text-red-400 uppercase leading-none">
                      {format(new Date(block.blocked_date + "T00:00:00"), "MMM", { locale: es })}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 capitalize">
                      {format(new Date(block.blocked_date + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {block.all_day ? "Día completo" : `${block.start_time?.slice(0,5)} - ${block.end_time?.slice(0,5)}`}
                      {block.reason ? ` · ${block.reason}` : ""}
                    </p>
                  </div>
                </div>
                <button onClick={() => deleteBlock(block.id)}
                  className="p-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <CalendarOff size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin fechas bloqueadas</p>
          </div>
        )}
      </div>

      {showBlockModal && (
        <BlockModal businessId={business?.id} onSave={loadData} onClose={() => setShowBlockModal(false)} />
      )}
    </div>
  )
}