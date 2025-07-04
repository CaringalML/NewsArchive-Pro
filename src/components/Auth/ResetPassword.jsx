import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../Common/LoadingSpinner'
import './ResetPassword.css'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState(true)

  const navigate = useNavigate()

  // Get the access token from URL parameters
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const type = searchParams.get('type')

  useEffect(() => {
    // Check if this is a valid password reset link
    if (type !== 'recovery' || !accessToken || !refreshToken) {
      setIsValidToken(false)
    }
  }, [accessToken, refreshToken, type])

  const validateForm = () => {
    const newErrors = {}

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    } else if (password.length < 8) {
      newErrors.password = 'Password should be at least 8 characters for better security'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Password strength checks
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (password && password.length >= 6) {
      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        newErrors.passwordStrength = 'Password should contain uppercase, lowercase, and numbers'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    try {
      // Set the session with the tokens from the URL
      if (accessToken && refreshToken) {
        // Use Supabase to set session and update password
        const { supabase } = await import('../../services/supabase')
        
        // Set the session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (sessionError) {
          setErrors({ general: 'Invalid or expired reset link' })
          setLoading(false)
          return
        }

        // Update the password
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        })

        if (updateError) {
          setErrors({ general: updateError.message })
        } else {
          setIsSuccess(true)
          // Sign out after password reset
          await supabase.auth.signOut()
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: 'Password updated successfully! Please sign in with your new password.' 
              } 
            })
          }, 3000)
        }
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  // Invalid token view
  if (!isValidToken) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="error-content">
            <div className="error-icon">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833-.208 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="error-title">Invalid Reset Link</h1>
            <p className="error-description">
              This password reset link is invalid or has expired. Please request a new password reset.
            </p>
            <div className="error-actions">
              <Link to="/forgot-password" className="btn btn-primary">
                Request New Reset Link
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success view
  if (isSuccess) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="success-content">
            <div className="success-icon">
              <CheckCircleIcon className="w-12 h-12" />
            </div>
            <h1 className="success-title">Password Updated Successfully!</h1>
            <p className="success-description">
              Your password has been updated successfully. You will be redirected to the sign in page in a few seconds.
            </p>
            <div className="success-actions">
              <Link to="/login" className="btn btn-primary">
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reset password form
  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <h1 className="reset-password-title">Set New Password</h1>
          <p className="reset-password-subtitle">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="reset-password-form">
          {errors.general && (
            <div className="error-alert">
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              New Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`form-input ${errors.password || errors.passwordStrength ? 'error' : ''}`}
                placeholder="Enter your new password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
            {errors.passwordStrength && (
              <span className="warning-message">{errors.passwordStrength}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your new password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="error-message">{errors.confirmPassword}</span>
            )}
          </div>

          {/* Password Requirements */}
          <div className="password-requirements">
            <h4 className="requirements-title">Password Requirements:</h4>
            <ul className="requirements-list">
              <li className={password.length >= 8 ? 'valid' : ''}>
                At least 8 characters
              </li>
              <li className={/[A-Z]/.test(password) ? 'valid' : ''}>
                One uppercase letter
              </li>
              <li className={/[a-z]/.test(password) ? 'valid' : ''}>
                One lowercase letter
              </li>
              <li className={/\d/.test(password) ? 'valid' : ''}>
                One number
              </li>
            </ul>
          </div>

          <button
            type="submit"
            className="reset-password-button"
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="small" color="white" />
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        <div className="reset-password-footer">
          <p className="back-to-login">
            Remember your password?{' '}
            <Link to="/login" className="login-link">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword