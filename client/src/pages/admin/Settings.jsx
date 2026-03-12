import { useState, useEffect } from "react"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"
import {
  Save, Copy, ExternalLink, Check, Scissors,
  MapPin, Phone, Mail, Globe, User, Link,
  AlertCircle, Eye
} from "lucide-react"
import toast from "react-hot-toast"

export default function Settings() {
  const { user } = useAuthStore()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" })
  const [slugForm, setSlugForm] = useState("")
  const [slugAvailable, setSlugAvailable] = useState(null)
  const [checkingSlug, setCheckingSlug] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", user.id).single()
    if (biz) {
      setBusiness(biz)
      setForm({ name: biz.name || "", email: biz.email || "", phone: biz.phone || "", address: biz.address || "" })
      setSlugForm(biz.slug || "")
    }
    setLoading(false)
  }

  async function checkSlug(value) {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    setSlugForm(clean)
    if (clean === business?.slug) { setSlugAvailable(null); return }
    if (clean.length < 3) { setSlugAvailable(false); return }
    setCheckingSlug(true)
    const { data } = await supabase.from("businesses").select("id").eq("slug", clean).single()
    setSlugAvailable(!data)
    setCheckingSlug(false)
  }

  async function handleSave() {
    if (!form.name) return toast.error("El nombre es requerido")
    setSaving(true)
    try {
      const updates = { name: form.name, phone: form.phone, address: form.address, updated_at: new Date() }
      if (slugForm && slugForm !== business.slug && slugAvailable) updates.slug = slugForm
      const { error } = await supabase.from("businesses").update(updates).eq("id", business.id)
      if (error) throw error
      toast.success("Configuración guardada ✓")
      loadData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/b/${business.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Link copiado al portapapeles")
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const publicUrl = `${window.location.origin}/b/${business?.slug}`

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los datos de tu negocio</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* Link público — destacado arriba */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 mb-6 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Link size={16} className="text-amber-100" />
          <p className="text-amber-100 text-sm font-medium">Tu link de reservas</p>
        </div>
        <p className="text-white font-bold text-sm mb-3 break-all">{publicUrl}</p>
        <div className="flex gap-2">
          <button onClick={copyLink}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "¡Copiado!" : "Copiar link"}
          </button>
          <a href={`/b/${business?.slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <Eye size={14} /> Ver página
          </a>
        </div>
      </div>

      {/* Datos del negocio */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Scissors size={18} className="text-amber-500" />
          <h2 className="font-bold text-gray-900">Datos del negocio</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nombre del negocio *</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-base pl-9" placeholder="Barbería El Maestro" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Teléfono</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-base pl-9" placeholder="+56 9 1234 5678" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Dirección</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-base pl-9" placeholder="Av. Principal 123, Santiago" value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email de contacto</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-base pl-9 bg-gray-50 text-gray-400 cursor-not-allowed" value={form.email} disabled />
            </div>
            <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar</p>
          </div>
        </div>
      </div>

      {/* Slug / URL personalizada */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={18} className="text-amber-500" />
          <h2 className="font-bold text-gray-900">URL personalizada</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Personaliza el link que compartes con tus clientes</p>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Identificador único</label>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-transparent">
            <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-r border-gray-300 whitespace-nowrap">
              {window.location.origin}/b/
            </span>
            <input
              className="flex-1 px-3 py-2 text-sm outline-none"
              value={slugForm}
              onChange={e => checkSlug(e.target.value)}
              placeholder="mi-barberia"
            />
            {checkingSlug && <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-3" />}
            {!checkingSlug && slugAvailable === true && <Check size={16} className="text-green-500 mr-3" />}
            {!checkingSlug && slugAvailable === false && <AlertCircle size={16} className="text-red-400 mr-3" />}
          </div>
          {slugAvailable === false && slugForm.length >= 3 && slugForm !== business?.slug && (
            <p className="text-xs text-red-500 mt-1">Este identificador ya está en uso</p>
          )}
          {slugAvailable === true && (
            <p className="text-xs text-green-600 mt-1">¡Disponible! Guarda los cambios para aplicarlo</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones</p>
        </div>
      </div>

      {/* Info cuenta */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">Información de cuenta</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-700">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Plan</span>
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              ✨ Free
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Estado</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Activo
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}