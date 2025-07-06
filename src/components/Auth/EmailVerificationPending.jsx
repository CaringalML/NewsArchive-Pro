import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  EnvelopeIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  NewspaperIcon 
} from '@heroicons/react/24/outline'
import { supabase } from '../../services/supabase'
import './EmailVerificationPending.css'

const EmailVerificationPending = () => {
  const location = useLocation()
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  
  // Get email from location state (passed from signup)
  const email = location.state?.email || 'your email'
  
  useEffect(() => {
    let timer
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResendEmail = async () => {
    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${process.env.REACT_APP_SITE_URL || window.location.origin}/email-verified`
        }
      })
      
      if (error) {
        console.error('Error resending email:', error)
      } else {
        setResendCooldown(60) // 60 second cooldown
      }
    } catch (error) {
      console.error('Error resending email:', error)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="email-verification-container">
      <div className="email-verification-card">
        <div className="verification-content">
          <div className="logo">
            <NewspaperIcon className="logo-icon" />
            <Link to="/" className="logo-text">NewsArchive Pro</Link>
          </div>
          
          <div className="verification-icon">
            <EnvelopeIcon className="w-16 h-16" />
          </div>
          
          <h1 className="verification-title">Check Your Email! 📧</h1>
          
          <p className="verification-description">
            We've sent a verification link to <strong>{email}</strong>
          </p>

          <div className="verification-steps">
            <h3 className="steps-title">Next steps:</h3>
            <div className="step-list">
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <div className="step-text">Check your email inbox</div>
                  <div className="step-subtitle">Look for an email from NewsArchive Pro</div>
                </div>
              </div>
              
              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <div className="step-text">Click "Verify Email Address"</div>
                  <div className="step-subtitle">This will activate your account</div>
                </div>
              </div>
              
              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <div className="step-text">Start using NewsArchive Pro</div>
                  <div className="step-subtitle">You'll be redirected to sign in</div>
                </div>
              </div>
            </div>
          </div>

          <div className="verification-features">
            <h3 className="features-title">What you'll get access to:</h3>
            <div className="features-list">
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>AI-powered newspaper digitization</span>
              </div>
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>Advanced OCR text recognition</span>
              </div>
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>METS/ALTO metadata generation</span>
              </div>
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>Cloud storage and management</span>
              </div>
            </div>
          </div>

          <div className="verification-actions">
            <Link to="/login" className="btn btn-primary">
              I've Verified My Email
            </Link>
            
            <button 
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || isResending}
              className="btn btn-outline"
            >
              {isResending ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <ClockIcon className="w-4 h-4" />
                  Resend in {resendCooldown}s
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  Resend Email
                </>
              )}
            </button>
          </div>

          <div className="help-section">
            <h3>Didn't receive the email?</h3>
            <ul>
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes - emails can take time to arrive</li>
              <li>Try resending the verification email</li>
            </ul>
            
            <p className="support-text">
              Still having trouble? Contact our support team at{' '}
              <a href="mailto:support@newsarchivepro.com" className="support-link">
                support@newsarchivepro.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailVerificationPending