import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { EyeIcon, EyeSlashIcon, NewspaperIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../Common/LoadingSpinner'
import './SignIn.css'

const SignIn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSignUp, setIsSignUp] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  const validateForm = () => {
    const newErrors = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    const { data, error } = await signIn(email, password)

    if (!error && data) {
      navigate(from, { replace: true })
    }
    
    setLoading(false)
  }

  const handleSwitchToSignUp = () => {
    setIsSignUp(true)
    // Navigate to register page after animation
    setTimeout(() => {
      navigate('/register')
    }, 300)
  }

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth login functionality
    console.log('Login with Google')
  }

  return (
    <div className="auth-page">
      <div className={`auth-container ${isSignUp ? 'right-panel-active' : ''}`}>
        {/* Sign In Form */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="logo">
              <NewspaperIcon className="logo-icon" />
              <Link to="/home" className="logo-text">NewsArchive Pro</Link>
            </div>
            
            <h1>Welcome Back</h1>
            <p>Sign in to continue preserving history</p>
            
            <div className="social-container">
              <button 
                type="button" 
                className="social google-button" 
                aria-label="Sign in with Google"
                onClick={handleGoogleLogin}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
            
            <div className="social-divider">
              <span className="divider-or">or</span>
              <span className="divider-text">sign in with email</span>
            </div>
            
            {errors.general && (
              <div className="error-alert">
                {errors.general}
              </div>
            )}

            <div className="input-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`auth-input ${errors.email ? 'error' : ''}`}
                placeholder="Email"
                disabled={loading}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="input-group">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`auth-input ${errors.password ? 'error' : ''}`}
                  placeholder="Password"
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
            </div>

            <Link to="/forgot-password" className="forgot-password-link">
              Forgot your password?
            </Link>

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="small" color="white" /> : 'Sign In'}
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
            <div className="overlay-panel overlay-right">
              <div className="logo">
                <NewspaperIcon className="logo-icon" />
                <Link to="/home" className="logo-text">NewsArchive Pro</Link>
              </div>
              <h1>Join Our Mission!</h1>
              <p>Start your journey with us and help preserve historical newspapers using cutting-edge digitization technology</p>
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
                    <div className="calendar-month">APRIL</div>
                    <div className="calendar-year">1925</div>
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
                    <div className="calendar-date"></div>
                    <div className="calendar-date"></div>
                    <div className="calendar-date">1</div>
                    <div className="calendar-date">2</div>
                    <div className="calendar-date">3</div>
                    <div className="calendar-date">4</div>
                    <div className="calendar-date">5</div>
                    <div className="calendar-date">6</div>
                    <div className="calendar-date">7</div>
                    <div className="calendar-date highlighted">8</div>
                    <div className="calendar-date">9</div>
                    <div className="calendar-date">10</div>
                    <div className="calendar-date">11</div>
                    <div className="calendar-date">12</div>
                    <div className="calendar-date">13</div>
                    <div className="calendar-date">14</div>
                    <div className="calendar-date">15</div>
                    <div className="calendar-date">16</div>
                    <div className="calendar-date">17</div>
                    <div className="calendar-date">18</div>
                  </div>
                  <div className="calendar-ring"></div>
                </div>
              </div>
              <button className="ghost-button" onClick={handleSwitchToSignUp}>
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignIn