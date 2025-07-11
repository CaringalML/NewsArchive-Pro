import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [initialLoad, setInitialLoad] = useState(true)
  const [hasShownInitialToast, setHasShownInitialToast] = useState(false)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
      // Set a small delay before marking initial load as complete
      setTimeout(() => {
        setInitialLoad(false)
      }, 1000)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Only show toasts for user-initiated actions, not automatic session restoration
        if (event === 'SIGNED_IN' && !initialLoad && !hasShownInitialToast) {
          const provider = session?.user?.app_metadata?.provider
          if (provider === 'google') {
            toast.success('Successfully signed in with Google!')
          } else {
            toast.success('Successfully signed in!')
          }
          setHasShownInitialToast(true)
        } else if (event === 'SIGNED_OUT') {
          toast.success('Successfully signed out!')
          setHasShownInitialToast(false) // Reset for next sign-in
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery event detected')
          // Don't show toast here as it will be handled by the AuthHandler component
        }
        
        // Skip showing toasts for these events
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          // These are automatic events, don't show toasts
          return
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [initialLoad, hasShownInitialToast])

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${process.env.REACT_APP_SITE_URL || window.location.origin}/email-verified`
        }
      })

      // Return the data and error without showing toasts
      // Let the component handle the UI feedback
      return { data, error }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        toast.error(error.message)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.REACT_APP_SITE_URL || window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        toast.error(error.message)
        return { data: null, error }
      }

      // Don't show toast here as the redirect will handle the success message
      return { data, error: null }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      // Clear local state immediately
      setUser(null)
      setSession(null)
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        toast.error(error.message)
      }
      return { error }
    } catch (error) {
      console.error('Sign out exception:', error)
      toast.error('An unexpected error occurred during sign out')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.REACT_APP_SITE_URL || window.location.origin}/reset-password`
      })
      if (error) {
        toast.error(error.message)
        return { data: null, error }
      }
      toast.success('Password reset email sent!')
      return { data, error: null }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { data: null, error }
    }
  }

  const updatePassword = async (password) => {
    try {
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) {
        toast.error(error.message)
        return { data: null, error }
      }
      toast.success('Password updated successfully!')
      return { data, error: null }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { data: null, error }
    }
  }

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      })
      if (error) {
        toast.error(error.message)
        return { data: null, error }
      }
      toast.success('Profile updated successfully!')
      return { data, error: null }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { data: null, error }
    }
  }

  // Add resend verification email function
  const resendVerificationEmail = async (email) => {
    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${process.env.REACT_APP_SITE_URL || window.location.origin}/email-verified`
        }
      })
      
      if (error) {
        toast.error(error.message)
        return { data: null, error }
      }
      
      toast.success('Verification email sent!')
      return { data, error: null }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { data: null, error }
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    resendVerificationEmail
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext