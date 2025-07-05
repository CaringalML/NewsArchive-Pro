import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
// UPDATED: Removed EnvelopeIcon
import { ArrowLeftIcon, NewspaperIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../Common/LoadingSpinner'
import './ForgotPassword.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  const { resetPassword } = useAuth()

  const validateForm = () => {
    const newErrors = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    const { error } = await resetPassword(email)

    if (!error) {
      setIsSubmitted(true)
    }
    
    setLoading(false)
  }

  if (isSubmitted) {
    return (
      <div className="auth-page">
        <div className="forgot-password-container">
          <div className="forgot-password-card">
            <div className="success-content">
              <div className="logo">
                <NewspaperIcon className="logo-icon" />
                <Link to="/home" className="logo-text">NewsArchive Pro</Link>
              </div>
              
              <div className="success-icon">
                <CheckCircleIcon className="w-16 h-16" />
              </div>
              
              <h1 className="success-title">Check Your Email! 📧</h1>
              
              <div className="success-details">
                <p className="success-description">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <div className="email-steps">
                  <div className="step-item">
                    <span className="step-number">1</span>
                    <span className="step-text">Check your email inbox</span>
                  </div>
                  <div className="step-item">
                    <span className="step-number">2</span>
                    <span className="step-text">Click the "Reset Password" button</span>
                  </div>
                  <div className="step-item">
                    <span className="step-number">3</span>
                    <span className="step-text">Create your new password</span>
                  </div>
                </div>
              </div>

              <div className="success-actions">
                <Link to="/login" className="btn btn-primary">
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back to Sign In
                </Link>
                <button 
                  onClick={() => {
                    setIsSubmitted(false)
                    setEmail('')
                  }}
                  className="btn btn-secondary"
                >
                  Try Different Email
                </button>
              </div>

              <div className="help-section">
                <h3>Didn't receive the email?</h3>
                <ul>
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes - emails can take time to arrive</li>
                  <li>Contact support if you still need help</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <div className="forgot-password-content">
            <div className="logo">
              <NewspaperIcon className="logo-icon" />
              <Link to="/home" className="logo-text">NewsArchive Pro</Link>
            </div>

            <div className="forgot-password-header">
              <h1 className="forgot-password-title">Reset Your Password</h1>
              <p className="forgot-password-subtitle">
                Enter your email address and we'll send you a secure link to reset your password
              </p>
            </div>

            <form onSubmit={handleSubmit} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                {/* UPDATED: Removed the wrapper div and the icon element */}
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="Enter your email address"
                  disabled={loading}
                />
                {errors.email && (
                  <span className="error-message">{errors.email}</span>
                )}
              </div>

              <button
                type="submit"
                className="forgot-password-button"
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="small" color="white" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="forgot-password-footer">
              <p className="back-to-login">
                Remember your password?{' '}
                <Link to="/login" className="login-link">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </p>
            </div>

            <div className="security-info">
              <h3>🔒 Security Notice</h3>
              <div className="security-details">
                <div className="security-item">
                  <span className="security-icon">⏱️</span>
                  <span>Reset links expire in 24 hours</span>
                </div>
                <div className="security-item">
                  <span className="security-icon">🔐</span>
                  <span>Links can only be used once</span>
                </div>
                <div className="security-item">
                  <span className="security-icon">✉️</span>
                  <span>Check spam folder if not received</span>
                </div>
              </div>
            </div>

            <div className="support-section">
              <h3>Need Additional Help?</h3>
              <p>
                If you're having trouble accessing your account, our support team is here to help. 
                Contact us at{' '}
                <a href="mailto:support@newsarchivepro.com" className="support-link">
                  support@newsarchivepro.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword