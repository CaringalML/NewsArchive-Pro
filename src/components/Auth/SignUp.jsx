import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { EyeIcon, EyeSlashIcon, NewspaperIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../Common/LoadingSpinner'
import toast from 'react-hot-toast'
import './SignUp.css'

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSignIn, setIsSignIn] = useState(false)
  const [accountExistsError, setAccountExistsError] = useState(false)

  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    // Clear account exists error when user changes email
    if (name === 'email' && accountExistsError) {
      setAccountExistsError(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setAccountExistsError(false)

    const userData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      full_name: `${formData.firstName} ${formData.lastName}`
    }

    const { data, error } = await signUp(formData.email, formData.password, userData)

    if (error) {
      // Handle actual errors (network, validation, etc.)
      if (error.message.includes('already registered')) {
        setAccountExistsError(true)
        toast.error('An account with this email address already exists')
      } else {
        toast.error(error.message)
        setErrors({ general: error.message })
      }
    } else if (data?.user) {
      // Check if this might be an existing user based on user creation time
      const now = new Date()
      const userCreated = new Date(data.user.created_at)
      const timeDiff = now - userCreated
      
      // If user was created more than 1 minute ago, it's likely an existing account
      if (timeDiff > 60000) {
        setAccountExistsError(true)
        toast.error('An account with this email address already exists')
      } else {
        // It's a new signup - redirect to verification pending page
        navigate('/verify-email', { 
          state: { 
            email: formData.email
          } 
        })
      }
    } else {
      // Fallback case
      toast.error('Something went wrong. Please try again.')
      setErrors({ general: 'Something went wrong. Please try again.' })
    }
    
    setLoading(false)
  }

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    
    if (error) {
      setGoogleLoading(false)
    }
    // If successful, the redirect will handle navigation
    // Don't set loading to false here as the page will redirect
  }

  const handleSwitchToSignIn = () => {
    setIsSignIn(true)
    // Navigate to login page after animation
    setTimeout(() => {
      navigate('/login')
    }, 300)
  }

  return (
    <div className="auth-page">
      <div className={`auth-container ${!isSignIn ? 'right-panel-active' : ''}`}>
        {/* Sign Up Form */}
        <div className="form-container sign-up-container">
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="logo">
              <NewspaperIcon className="logo-icon" />
              <Link to="/home" className="logo-text">NewsArchive Pro</Link>
            </div>
            
            <h1>Create Account</h1>
            <p>Join thousands of institutions preserving history</p>
            
            <div className="social-container">
              <button 
                type="button" 
                className="social google-button" 
                aria-label="Sign up with Google"
                onClick={handleGoogleSignUp}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <LoadingSpinner size="small" color="primary" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                <span>{googleLoading ? 'Signing up...' : 'Continue with Google'}</span>
              </button>
            </div>
            
            <div className="social-divider">
              <span className="divider-or">or</span>
              <span className="divider-text">sign up with email</span>
            </div>
            
            {/* Account Already Exists Error */}
            {accountExistsError && (
              <div className="account-exists-alert">
                <div className="alert-content">
                  <ExclamationTriangleIcon className="alert-icon" />
                  <div className="alert-text">
                    <h4>Account Already Exists</h4>
                    <p>An account with this email address already exists. Would you like to sign in instead?</p>
                  </div>
                </div>
                <div className="alert-actions">
                  <Link to="/login" state={{ email: formData.email }} className="btn-alert-primary">
                    Sign In
                  </Link>
                  <Link to="/forgot-password" state={{ email: formData.email }} className="btn-alert-secondary">
                    Forgot Password?
                  </Link>
                </div>
              </div>
            )}

            {errors.general && (
              <div className="error-alert">
                {errors.general}
              </div>
            )}

            <div className="form-row">
              <div className="input-group">
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`auth-input ${errors.firstName ? 'error' : ''}`}
                  placeholder="First Name"
                  disabled={loading || googleLoading}
                />
                {errors.firstName && (
                  <span className="error-message">{errors.firstName}</span>
                )}
              </div>

              <div className="input-group">
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`auth-input ${errors.lastName ? 'error' : ''}`}
                  placeholder="Last Name"
                  disabled={loading || googleLoading}
                />
                {errors.lastName && (
                  <span className="error-message">{errors.lastName}</span>
                )}
              </div>
            </div>

            <div className="input-group">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`auth-input ${errors.email || accountExistsError ? 'error' : ''}`}
                placeholder="Email"
                disabled={loading || googleLoading}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="input-group">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`auth-input ${errors.password ? 'error' : ''}`}
                  placeholder="Password"
                  disabled={loading || googleLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || googleLoading}
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
            </div>

            <div className="input-group">
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`auth-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Confirm Password"
                  disabled={loading || googleLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading || googleLoading}
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

            <button
              type="submit"
              className="auth-button"
              disabled={loading || googleLoading}
            >
              {loading ? <LoadingSpinner size="small" color="white" /> : 'Sign Up'}
            </button>
          </form>
        </div>

        {/* Overlay */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="floating-pages">
              <div className="page"></div>
              <div className="page"></div>
              <div className="page"></div>
            </div>
            <div className="overlay-panel overlay-left">
              <div className="logo">
                <NewspaperIcon className="logo-icon" />
                <Link to="/home" className="logo-text">NewsArchive Pro</Link>
              </div>
              <h1>Welcome Back!</h1>
              <p>Connect with us and continue your journey in preserving historical newspapers for future generations</p>
              <div className="illustration">
                <div className="archive-cabinet">
                  <div className="cabinet-drawer"></div>
                  <div className="cabinet-drawer"></div>
                  <div className="cabinet-drawer"></div>
                  <div className="cabinet-drawer"></div>
                </div>
                <div className="newspaper-stack">
                  <div className="newspaper">
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                  </div>
                  <div className="newspaper">
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                  </div>
                  <div className="newspaper">
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                  </div>
                  <div className="newspaper">
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                    <div className="newspaper-line"></div>
                  </div>
                </div>
                <div className="vintage-calendar">
                  <div className="calendar-header">
                    <div className="calendar-month">MARCH</div>
                    <div className="calendar-year">1920</div>
                  </div>
                  <div className="calendar-body">
                    <div className="calendar-day">S</div>
                    <div className="calendar-day">M</div>
                    <div className="calendar-day">T</div>
                    <div className="calendar-day">W</div>
                    <div className="calendar-day">T</div>
                    <div className="calendar-day">F</div>
                    <div className="calendar-day">S</div>
                    <div className="calendar-date"></div>
                    <div className="calendar-date">1</div>
                    <div className="calendar-date">2</div>
                    <div className="calendar-date">3</div>
                    <div className="calendar-date">4</div>
                    <div className="calendar-date">5</div>
                    <div className="calendar-date">6</div>
                    <div className="calendar-date">7</div>
                    <div className="calendar-date">8</div>
                    <div className="calendar-date">9</div>
                    <div className="calendar-date">10</div>
                    <div className="calendar-date">11</div>
                    <div className="calendar-date">12</div>
                    <div className="calendar-date">13</div>
                    <div className="calendar-date highlighted">14</div>
                    <div className="calendar-date">15</div>
                    <div className="calendar-date">16</div>
                    <div className="calendar-date">17</div>
                    <div className="calendar-date">18</div>
                    <div className="calendar-date">19</div>
                    <div className="calendar-date">20</div>
                  </div>
                  <div className="calendar-ring"></div>
                </div>
              </div>
              <button className="ghost-button" onClick={handleSwitchToSignIn}>
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp