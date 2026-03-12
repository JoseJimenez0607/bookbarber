import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuthStore } from '../../store/authStore'
import { Scissors, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { user, init } = useAuthStore()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    businessName: ''
  })

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (user) navigate('/admin/dashboard')
  }, [user])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegister) {
        // Registro
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { business_name: form.businessName }
          }
        })
        if (error) throw error
        toast.success('Cuenta creada. Revisa tu email para confirmar.')
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        })
        if (error) throw error
        toast.success('Bienvenido 👋')
        navigate('/admin/dashboard')
      }
    } catch (err) {
      toast.error(err.message || 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl mb-4">
            <Scissors className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">BookBarber</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isRegister ? 'Crea tu cuenta de negocio' : 'Ingresa a tu panel'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del negocio
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  className="input-base"
                  placeholder="Ej: Barbería El Maestro"
                  required={isRegister}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-base"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-base pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2"
            >
              {loading ? 'Cargando...' : isRegister ? 'Crear cuenta' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {isRegister
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿Sin cuenta? Regístrate gratis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
