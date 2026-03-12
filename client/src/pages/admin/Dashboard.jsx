import { useState, useEffect } from "react"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts"
import {
  CalendarDays, Users, TrendingUp, Scissors,
  Target, Clock, CheckCircle2, Plus, Pencil, X
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns"
import { es } from "date-fns/locale"
import toast from "react-hot-toast"

function fmt(n) { return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n) }

function StatCard({ icon: Icon, label, value, sub, color = "amber" }) {
  const colors = {
    amber:  { bg: "bg-amber-50",   icon: "text-amber-500",  border: "border-amber-100" },
    green:  { bg: "bg-green-50",   icon: "text-green-500",  border: "border-green-100" },
    blue:   { bg: "bg-blue-50",    icon: "text-blue-500",   border: "border-blue-100"  },
    purple: { bg: "bg-purple-50",  icon: "text-purple-500", border: "border-purple-100"},
  }
  const c = colors[color]
  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`${c.bg} p-3 rounded-xl`}>
        <Icon className={c.icon} size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function ProgressBar({ value, max, color = "#f59e0b" }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function GoalModal({ goal, onSave, onClose }) {
  const [form, setForm] = useState(goal || { label: "", target: "", unit: "CLP", color: "#f59e0b" })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">{goal ? "Editar meta" : "Nueva meta"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nombre de la meta</label>
            <input className="input-base" placeholder="Ej: Ingresos del mes" value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Objetivo</label>
              <input className="input-base" type="number" placeholder="500000" value={form.target}
                onChange={e => setForm({ ...form, target: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Unidad</label>
              <select className="input-base" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                <option value="CLP">CLP ($)</option>
                <option value="cortes">Cortes</option>
                <option value="clientes">Clientes</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Color</label>
            <div className="flex gap-2">
              {["#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#ec4899"].map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={() => onSave(form)} className="btn-primary flex-1">Guardar meta</button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState(null)
  const [stats, setStats] = useState({ today: 0, monthRevenue: 0, totalClients: 0, totalBookings: 0 })
  const [upcoming, setUpcoming] = useState([])
  const [chartData, setChartData] = useState([])
  const [goals, setGoals] = useState([])
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editGoal, setEditGoal] = useState(null)

  useEffect(() => { if (user) loadAll() }, [user])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", user.id).single()
      setBusiness(biz)
      if (!biz) return

      const now = new Date()
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd")
      const monthEnd   = format(endOfMonth(now), "yyyy-MM-dd")
      const today      = format(now, "yyyy-MM-dd")

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, services(name, price)")
        .eq("business_id", biz.id)
        .gte("booking_date", monthStart)
        .lte("booking_date", monthEnd)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true })

      if (bookings) {
        const todayBookings = bookings.filter(b => b.booking_date === today && b.status !== "cancelled")
        const completed = bookings.filter(b => b.status === "completed")
        const revenue = completed.reduce((sum, b) => sum + (b.services?.price || 0), 0)
        const clients = new Set(bookings.filter(b => b.status !== "cancelled").map(b => b.client_email)).size
        setStats({ today: todayBookings.length, monthRevenue: revenue, totalClients: clients, totalBookings: bookings.filter(b => b.status !== "cancelled").length })
        setUpcoming(bookings.filter(b => b.booking_date >= today && b.status === "confirmed").slice(0, 5))

        const days = eachDayOfInterval({ start: startOfMonth(now), end: now })
        setChartData(days.map(day => {
          const d = format(day, "yyyy-MM-dd")
          const dayCompleted = bookings.filter(b => b.booking_date === d && b.status === "completed")
          const dayAll = bookings.filter(b => b.booking_date === d && b.status !== "cancelled")
          return {
            day: format(day, "d", { locale: es }),
            ingresos: dayCompleted.reduce((s, b) => s + (b.services?.price || 0), 0),
            reservas: dayAll.length,
            isToday: isToday(day),
          }
        }))
      }

      const saved = localStorage.getItem(`goals_${biz.id}`)
      if (saved) setGoals(JSON.parse(saved))
    } catch { toast.error("Error cargando datos") }
    finally { setLoading(false) }
  }

  function saveGoals(newGoals) {
    setGoals(newGoals)
    if (business) localStorage.setItem(`goals_${business.id}`, JSON.stringify(newGoals))
  }

  function handleSaveGoal(form) {
    if (!form.label || !form.target) return toast.error("Completa todos los campos")
    const updated = editGoal
      ? goals.map(g => g.id === editGoal.id ? { ...form, id: editGoal.id } : g)
      : [...goals, { ...form, id: Date.now() }]
    saveGoals(updated)
    setShowGoalModal(false)
    setEditGoal(null)
    toast.success(editGoal ? "Meta actualizada" : "Meta creada")
  }

  function getGoalProgress(goal) {
    if (goal.unit === "CLP") return stats.monthRevenue
    if (goal.unit === "cortes") return stats.totalBookings
    if (goal.unit === "clientes") return stats.totalClients
    return 0
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">Día {label}</p>
        <p className="text-amber-600">{fmt(payload[0]?.value || 0)}</p>
        <p className="text-gray-500">{payload[1]?.value || 0} reservas</p>
      </div>
    )
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Cargando dashboard...</p>
      </div>
    </div>
  )

  const monthName = format(new Date(), "MMMM yyyy", { locale: es })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{monthName}</p>
        </div>
        {business && (
          <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
            <Scissors size={16} className="text-amber-500" />
            <span className="text-sm font-medium text-amber-700">{business.name}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Reservas hoy"     value={stats.today}             sub="confirmadas"          color="amber"  />
        <StatCard icon={TrendingUp}   label="Ingresos del mes" value={fmt(stats.monthRevenue)}  sub="solo servicios completados" color="green"  />
        <StatCard icon={Users}        label="Clientes únicos"  value={stats.totalClients}       sub="este mes"             color="blue"   />
        <StatCard icon={Scissors}     label="Reservas del mes" value={stats.totalBookings}      sub="total"                color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Ingresos por día</h2>
            <span className="text-xs text-gray-400 capitalize">{monthName}</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fef3c7" }} />
                <Bar dataKey="ingresos" radius={[6,6,0,0]} maxBarSize={32}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.isToday ? "#f59e0b" : "#fde68a"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Aún no hay reservas este mes</div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Próximas reservas</h2>
            <Clock size={16} className="text-gray-400" />
          </div>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map(b => (
                <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-amber-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-amber-700">{b.client_name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{b.client_name}</p>
                    <p className="text-xs text-gray-500 truncate">{b.services?.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-amber-600 font-medium">
                        {b.booking_date === format(new Date(), "yyyy-MM-dd") ? "Hoy" : format(new Date(b.booking_date + "T00:00:00"), "d MMM", { locale: es })}
                      </span>
                      <span className="text-xs text-gray-400">· {b.start_time?.slice(0,5)}</span>
                    </div>
                  </div>
                  <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <CalendarDays size={32} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Sin reservas próximas</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-amber-500" />
            <h2 className="font-bold text-gray-900">Metas del mes</h2>
          </div>
          <button onClick={() => { setEditGoal(null); setShowGoalModal(true) }}
            className="flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={15} /> Nueva meta
          </button>
        </div>
        {goals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map(goal => {
              const current = getGoalProgress(goal)
              const target = Number(goal.target)
              const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0
              const display = goal.unit === "CLP" ? fmt(current) : `${current} ${goal.unit}`
              const targetDisplay = goal.unit === "CLP" ? fmt(target) : `${target} ${goal.unit}`
              return (
                <div key={goal.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: goal.color }} />
                      <span className="text-sm font-semibold text-gray-800">{goal.label}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditGoal(goal); setShowGoalModal(true) }} className="text-gray-300 hover:text-gray-500 p-1"><Pencil size={13} /></button>
                      <button onClick={() => { saveGoals(goals.filter(g => g.id !== goal.id)); toast.success("Meta eliminada") }} className="text-gray-300 hover:text-red-400 p-1"><X size={13} /></button>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>{display}</span>
                      <span className="font-semibold" style={{ color: goal.color }}>{pct}%</span>
                    </div>
                    <ProgressBar value={current} max={target} color={goal.color} />
                  </div>
                  <p className="text-xs text-gray-400">Meta: {targetDisplay}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl">
            <Target size={36} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500">Sin metas este mes</p>
            <p className="text-xs text-gray-400 mt-1">Crea una meta para hacer seguimiento de tu progreso</p>
            <button onClick={() => setShowGoalModal(true)} className="mt-4 btn-primary text-sm py-2 px-4">Crear primera meta</button>
          </div>
        )}
      </div>

      {showGoalModal && (
        <GoalModal goal={editGoal} onSave={handleSaveGoal} onClose={() => { setShowGoalModal(false); setEditGoal(null) }} />
      )}
    </div>
  )
}