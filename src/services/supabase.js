import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const auth = {
  signUp: async (email, password, userData = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: () => {
    return supabase.auth.getUser()
  },

  getCurrentSession: () => {
    return supabase.auth.getSession()
  },

  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  },

  updatePassword: async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password })
    return { data, error }
  },

  updateProfile: async (updates) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    })
    return { data, error }
  }
}

export default supabase