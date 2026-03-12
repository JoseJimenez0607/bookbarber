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
