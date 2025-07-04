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

  const handleSocialLogin = (provider) => {
    // TODO: Implement social login functionality
    console.log(`Login with ${provider}`)
  }

  return (
    <div className="auth-page">
      <div className={`auth-container ${isSignUp ? 'right-panel-active' : ''}`}>
        {/* Sign In Form */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="logo">
              <NewspaperIcon className="logo-icon" />
              <span className="logo-text">NewsArchive Pro</span>
            </div>
            
            <h1>Welcome Back</h1>
            <p>Sign in to continue preserving history</p>
            
            <div className="social-container">
              <button 
                type="button" 
                className="social" 
                aria-label="Sign in with Facebook"
                onClick={() => handleSocialLogin('Facebook')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
              <button 
                type="button" 
                className="social" 
                aria-label="Sign in with Google"
                onClick={() => handleSocialLogin('Google')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
              <button 
                type="button" 
                className="social" 
                aria-label="Sign in with LinkedIn"
                onClick={() => handleSocialLogin('LinkedIn')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </button>
            </div>
            
            <span className="social-divider">or use your account</span>
            
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
                <span className="logo-text">NewsArchive Pro</span>
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