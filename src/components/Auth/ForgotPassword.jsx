import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
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
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <div className="success-content">
            <div className="success-icon">
              <EnvelopeIcon className="w-12 h-12" />
            </div>
            <h1 className="success-title">Check Your Email</h1>
            <p className="success-description">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="success-instructions">
              Click the link in your email to reset your password. If you don't see the email, 
              check your spam folder or try again with a different email address.
            </p>
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <h1 className="forgot-password-title">Reset Your Password</h1>
          <p className="forgot-password-subtitle">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <div className="input-wrapper">
              <EnvelopeIcon className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email address"
                disabled={loading}
              />
            </div>
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

        <div className="help-section">
          <h3 className="help-title">Need Help?</h3>
          <div className="help-content">
            <div className="help-item">
              <strong>Can't find the email?</strong>
              <p>Check your spam or junk folder. The email might take a few minutes to arrive.</p>
            </div>
            <div className="help-item">
              <strong>Still having trouble?</strong>
              <p>Contact our support team at <a href="mailto:support@newsarchivepro.com" className="support-link">support@newsarchivepro.com</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword