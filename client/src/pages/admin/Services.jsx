import { useState, useEffect } from "react"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"
import { Plus, Pencil, Trash2, X, Scissors, Clock, DollarSign, ToggleLeft, ToggleRight, Search } from "lucide-react"
import toast from "react-hot-toast"

const COLORS = ["#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#ec4899","#06b6d4","#84cc16"]

function Badge({ active }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
      {active ? "Activo" : "Inactivo"}
    </span>
  )
}

function ServiceModal({ service, onSave, onClose }) {
  const [form, setForm] = useState(service || { name: "", description: "", duration_min: 30, price: "", color: "#f59e0b", is_active: true })
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!form.name || !form.price || !form.duration_min) return toast.error("Nombre, precio y duración son requeridos")
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">{service ? "Editar servicio" : "Nuevo servicio"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del servicio *</label>
            <input className="input-base" placeholder="Ej: Corte + Barba" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
            <textarea className="input-base resize-none" rows={2} placeholder="Descripción opcional..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Precio (CLP) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input className="input-base pl-7" type="number" placeholder="8000" value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Duración (min) *</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select className="input-base pl-8" value={form.duration_min}
                  onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })}>
                  {[15,20,30,45,60,75,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Color identificador</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">Servicio activo</p>
              <p className="text-xs text-gray-400">Los clientes pueden reservar este servicio</p>
            </div>
            <button onClick={() => setForm({ ...form, is_active: !form.is_active })}>
              {form.is_active
                ? <ToggleRight size={32} className="text-amber-500" />
                : <ToggleLeft size={32} className="text-gray-300" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? "Guardando..." : service ? "Guardar cambios" : "Crear servicio"}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirm({ service, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">Eliminar servicio</h3>
        <p className="text-sm text-gray-500 mb-6">¿Eliminar <strong>{service.name}</strong>? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Services() {
  const { user } = useAuthStore()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editService, setEditService] = useState(null)
  const [deleteService, setDeleteService] = useState(null)
  const [search, setSearch] = useState("")

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", user.id).single()
    if (biz) {
      setBusiness(biz)
      const { data } = await supabase.from("services").select("*").eq("business_id", biz.id).order("created_at", { ascending: false })
      setServices(data || [])
    }
    setLoading(false)
  }

  async function handleSave(form) {
    try {
      if (editService) {
        const { error } = await supabase.from("services").update({
          name: form.name, description: form.description,
          duration_min: form.duration_min, price: Number(form.price),
          color: form.color, is_active: form.is_active
        }).eq("id", editService.id)
        if (error) throw error
        toast.success("Servicio actualizado")
      } else {
        const { error } = await supabase.from("services").insert({
          business_id: business.id, name: form.name,
          description: form.description, duration_min: form.duration_min,
          price: Number(form.price), color: form.color, is_active: form.is_active
        })
        if (error) throw error
        toast.success("Servicio creado")
      }
      setShowModal(false)
      setEditService(null)
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete() {
    try {
      const { error } = await supabase.from("services").delete().eq("id", deleteService.id)
      if (error) throw error
      toast.success("Servicio eliminado")
      setDeleteService(null)
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function toggleActive(service) {
    await supabase.from("services").update({ is_active: !service.is_active }).eq("id", service.id)
    setServices(services.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s))
    toast.success(service.is_active ? "Servicio desactivado" : "Servicio activado")
  }

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
  const fmt = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
          <p className="text-gray-500 text-sm mt-0.5">{services.length} servicio{services.length !== 1 ? "s" : ""} configurado{services.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setEditService(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nuevo servicio
        </button>
      </div>

      {/* Buscador */}
      {services.length > 0 && (
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-base pl-9 max-w-xs" placeholder="Buscar servicio..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {/* Lista */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(service => (
            <div key={service.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all ${service.is_active ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
              {/* Color strip */}
              <div className="h-1.5 rounded-t-2xl" style={{ backgroundColor: service.color || "#f59e0b" }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{service.name}</h3>
                    {service.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{service.description}</p>}
                  </div>
                  <Badge active={service.is_active} />
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-green-500" />
                    <span className="text-sm font-bold text-gray-900">{fmt(service.price)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-400" />
                    <span className="text-sm text-gray-600">{service.duration_min} min</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => toggleActive(service)}
                    className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
                    {service.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => { setEditService(service); setShowModal(true) }}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-colors text-gray-400">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteService(service)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors text-gray-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scissors size={28} className="text-amber-400" />
          </div>
          <h3 className="font-bold text-gray-700 text-lg mb-1">
            {search ? "Sin resultados" : "Sin servicios aún"}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {search ? `No hay servicios que coincidan con "${search}"` : "Crea tu primer servicio para empezar a recibir reservas"}
          </p>
          {!search && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Crear primer servicio
            </button>
          )}
        </div>
      )}

      {showModal && (
        <ServiceModal service={editService} onSave={handleSave} onClose={() => { setShowModal(false); setEditService(null) }} />
      )}
      {deleteService && (
        <DeleteConfirm service={deleteService} onConfirm={handleDelete} onClose={() => setDeleteService(null)} />
      )}
    </div>
  )
}