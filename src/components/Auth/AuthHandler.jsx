import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'

const AuthHandler = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // Redirect to reset password page when PASSWORD_RECOVERY event is triggered
          navigate('/reset-password')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  return null // This component doesn't render anything
}

export default AuthHandler