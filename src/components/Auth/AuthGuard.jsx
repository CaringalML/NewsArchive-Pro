import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../Common/LoadingSpinner'
import './AuthGuard.css'

const AuthGuard = ({ children, requireAuth = true }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-guard-loading">
        <LoadingSpinner />
      </div>
    )
  }

  if (requireAuth && !user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!requireAuth && user) {
    // Redirect authenticated users away from auth pages
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default AuthGuard