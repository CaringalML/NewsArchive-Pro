import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../services/supabase'
import LoadingSpinner from '../Common/LoadingSpinner'
import './EmailVerified.css'

const EmailVerified = () => {
  const location = useLocation()
  const [verificationStatus, setVerificationStatus] = useState('loading')
  const [countdown, setCountdown] = useState(5)
  const navigate = useNavigate()

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Try to get tokens from both URL search params and hash
        const urlParams = new URLSearchParams(location.search)
        const hashParams = new URLSearchParams(location.hash.substring(1))
        
        // Check both sources for tokens
        let accessToken = urlParams.get('access_token') || hashParams.get('access_token')
        let refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token')
        let error = urlParams.get('error') || hashParams.get('error')
        let errorCode = urlParams.get('error_code') || hashParams.get('error_code')
        let errorDescription = urlParams.get('error_description') || hashParams.get('error_description')

        // Check for errors in URL
        if (error) {
          if (error === 'access_denied') {
            if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
              setVerificationStatus('expired')
            } else {
              setVerificationStatus('error')
            }
          } else {
            setVerificationStatus('error')
          }
          return
        }

        // Check if we have the required tokens
        if (!accessToken || !refreshToken) {
          setVerificationStatus('error')
          return
        }

        // Verify the email with the tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (sessionError) {
          if (sessionError.message.includes('expired') || sessionError.message.includes('invalid')) {
            setVerificationStatus('expired')
          } else {
            setVerificationStatus('error')
          }
          return
        }

        if (data.session && data.user) {
          setVerificationStatus('success')
          
          // Sign out the user after verification so they need to sign in
          await supabase.auth.signOut()
          
          // Start countdown for redirect
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer)
                navigate('/login', { 
                  state: { 
                    message: 'Email verified successfully! Please sign in to continue.',
                    verified: true
                  } 
                })
                return 0
              }
              return prev - 1
            })
          }, 1000)

          return () => clearInterval(timer)
        } else {
          setVerificationStatus('error')
        }
      } catch (err) {
        setVerificationStatus('error')
      }
    }

    // Add a small delay to ensure the page has fully loaded
    const timer = setTimeout(verifyEmail, 100)
    return () => clearTimeout(timer)
  }, [location, navigate])

  if (verificationStatus === 'loading') {
    return (
      <div className="email-verified-container">
        <div className="email-verified-card">
          <div className="verification-content">
            <LoadingSpinner size="large" />
            <h1 className="verification-title">Verifying Your Email</h1>
            <p className="verification-description">
              Please wait while we verify your email address...
            </p>
            <div className="loading-steps">
              <div className="step">
                <div className="step-icon">📧</div>
                <div className="step-text">Reading verification link</div>
              </div>
              <div className="step">
                <div className="step-icon">🔐</div>
                <div className="step-text">Validating security tokens</div>
              </div>
              <div className="step">
                <div className="step-icon">✅</div>
                <div className="step-text">Activating your account</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (verificationStatus === 'success') {
    return (
      <div className="email-verified-container">
        <div className="email-verified-card">
          <div className="verification-content">
            <div className="success-icon">
              <CheckCircleIcon className="w-16 h-16" />
            </div>
            <h1 className="verification-title">Email Verified Successfully! 🎉</h1>
            <p className="verification-description">
              Your email has been verified and your NewsArchive Pro account is now active. 
              You can now sign in to start preserving historical newspapers.
            </p>
            <div className="success-features">
              <div className="feature-item">
                <span className="feature-icon">📰</span>
                <span>Upload newspaper collections</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🤖</span>
                <span>AI-powered OCR processing</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔍</span>
                <span>Advanced search capabilities</span>
              </div>
            </div>
            <div className="countdown-info">
              <p className="countdown-text">
                Redirecting to sign in page in <span className="countdown-number">{countdown}</span> seconds
              </p>
            </div>
            <div className="verification-actions">
              <Link to="/login" className="btn btn-primary">
                <ArrowRightIcon className="w-5 h-5" />
                Go to Sign In
              </Link>
              <Link to="/home" className="btn btn-secondary">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (verificationStatus === 'expired') {
    return (
      <div className="email-verified-container">
        <div className="email-verified-card">
          <div className="verification-content">
            <div className="error-icon">
              <ExclamationTriangleIcon className="w-16 h-16" />
            </div>
            <h1 className="verification-title">Verification Link Expired</h1>
            <p className="verification-description">
              This verification link has expired or has already been used. Verification links are valid for 24 hours for security reasons.
            </p>
            <div className="help-info">
              <h3>What can you do?</h3>
              <ul>
                <li>Sign up again with the same email address</li>
                <li>Check your email for a newer verification link</li>
                <li>Contact support if you continue having issues</li>
              </ul>
            </div>
            <div className="verification-actions">
              <Link to="/register" className="btn btn-primary">
                Sign Up Again
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Already verified? Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="email-verified-container">
      <div className="email-verified-card">
        <div className="verification-content">
          <div className="error-icon">
            <ExclamationTriangleIcon className="w-16 h-16" />
          </div>
          <h1 className="verification-title">Verification Failed</h1>
          <p className="verification-description">
            There was an error verifying your email address. This could be due to an invalid link, 
            expired token, or technical issue.
          </p>
          
          <div className="error-help">
            <h3>Common solutions:</h3>
            <ul>
              <li>Make sure you clicked the complete link from your email</li>
              <li>Try copying and pasting the full URL from your email</li>
              <li>Check if the verification link has expired (24 hours)</li>
              <li>Sign up again if the link is too old</li>
            </ul>
          </div>

          <div className="verification-actions">
            <Link to="/register" className="btn btn-primary">
              Sign Up Again
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Already verified? Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailVerified