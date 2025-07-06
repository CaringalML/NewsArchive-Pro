import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, ExclamationTriangleIcon, NewspaperIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../services/supabase'
import LoadingSpinner from '../Common/LoadingSpinner'
import './ResetPassword.css'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSuccess, setIsSuccess] = useState(false)
  const [canResetPassword, setCanResetPassword] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handlePasswordReset = async () => {
      setIsCheckingAuth(true)
      
      try {
        // First check if we have hash parameters (fresh from email link)
        const hashParams = new URLSearchParams(location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const tokenType = hashParams.get('type')
        const error = hashParams.get('error')
        const errorCode = hashParams.get('error_code')
        const errorDescription = hashParams.get('error_description')

        // Check for errors in URL
        if (error) {
          setCanResetPassword(false)
          if (error === 'access_denied') {
            if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
              setErrors({ general: 'This password reset link has expired. Please request a new one.' })
            } else if (errorDescription?.includes('invalid')) {
              setErrors({ general: 'This password reset link is invalid. Please request a new one.' })
            } else {
              setErrors({ general: 'This password reset link is no longer valid. Please request a new one.' })
            }
          } else {
            setErrors({ general: 'There was an error with your password reset link. Please try again.' })
          }
          setIsCheckingAuth(false)
          return
        }

        // If we have recovery tokens, set the session immediately
        if (tokenType === 'recovery' && accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (sessionError) {
            setCanResetPassword(false)
            if (sessionError.message.includes('expired')) {
              setErrors({ general: 'This password reset link has expired. Please request a new one.' })
            } else if (sessionError.message.includes('invalid')) {
              setErrors({ general: 'This password reset link is invalid. Please request a new one.' })
            } else {
              setErrors({ general: 'Unable to verify password reset link. Please request a new one.' })
            }
          } else if (data.session) {
            setCanResetPassword(true)
            // Clear the URL hash for cleaner URL
            window.history.replaceState({}, document.title, window.location.pathname)
          } else {
            setCanResetPassword(false)
            setErrors({ general: 'Unable to establish session. Please request a new reset link.' })
          }
        } else {
          // No tokens in URL, check if user is already authenticated (from auth state change)
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            setCanResetPassword(true)
          } else {
            setCanResetPassword(false)
            setErrors({ general: 'Invalid or expired reset link. Please request a new one.' })
          }
        }
      } catch (err) {
        setCanResetPassword(false)
        setErrors({ general: 'An error occurred while verifying your reset link. Please try again.' })
      } finally {
        setIsCheckingAuth(false)
      }
    }

    handlePasswordReset()
  }, [location.hash])

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

    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (password && password.length >= 6) {
      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        newErrors.passwordStrength = 'Password should contain uppercase, lowercase, and numbers'
      }
    }

    setErrors(prev => ({ ...prev, ...newErrors }))
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        if (updateError.message.includes('expired')) {
          setErrors({ general: 'Your session has expired. Please request a new password reset link.' })
        } else {
          setErrors({ general: updateError.message })
        }
      } else {
        setIsSuccess(true)
        // Sign out after password reset for security
        await supabase.auth.signOut()
        
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Password updated successfully! Please sign in with your new password.' 
            } 
          })
        }, 3000)
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="auth-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="verification-content">
              <div className="logo">
                <NewspaperIcon className="logo-icon" />
                <Link to="/home" className="logo-text">NewsArchive Pro</Link>
              </div>
              <LoadingSpinner size="large" />
              <h1 className="verification-title">Verifying Reset Link</h1>
              <p className="verification-description">
                Please wait while we verify your password reset link...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!canResetPassword) {
    return (
      <div className="auth-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="error-content">
              <div className="logo">
                <NewspaperIcon className="logo-icon" />
                <Link to="/home" className="logo-text">NewsArchive Pro</Link>
              </div>
              <div className="error-icon">
                <ExclamationTriangleIcon className="w-16 h-16" />
              </div>
              <h1 className="error-title">Reset Link Issue</h1>
              <p className="error-description">
                {errors.general || 'This password reset link is invalid or has expired.'}
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
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="auth-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="success-content">
              <div className="logo">
                <NewspaperIcon className="logo-icon" />
                <Link to="/home" className="logo-text">NewsArchive Pro</Link>
              </div>
              <div className="success-icon">
                <CheckCircleIcon className="w-16 h-16" />
              </div>
              <h1 className="success-title">Password Updated Successfully! 🎉</h1>
              <p className="success-description">
                Your password has been updated successfully. You will be redirected to the sign in page in a few seconds.
              </p>
              <div className="success-features">
                <div class="feature-item">
                  <span class="feature-icon">🔒</span>
                  <span>Your account is now secure</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✅</span>
                  <span>Password successfully updated</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">🚀</span>
                  <span>Ready to continue your journey</span>
                </div>
              </div>
              <div className="success-actions">
                <Link to="/login" className="btn btn-primary">
                  Go to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-content">
            <div className="logo">
              <NewspaperIcon className="logo-icon" />
              <Link to="/home" className="logo-text">NewsArchive Pro</Link>
            </div>
            
            <h1 className="reset-password-title">Set New Password</h1>
            <p className="reset-password-subtitle">
              Enter your new password below to complete the reset process
            </p>

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
      </div>
    </div>
  )
}

export default ResetPassword