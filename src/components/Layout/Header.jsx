import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  NewspaperIcon, 
  UserIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import './Header.css'

const Header = () => {
  const { user, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen)
  }

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo */}
        <div className="header-logo">
          <Link to="/" className="logo-link">
            <NewspaperIcon className="logo-icon" />
            <span className="logo-text">NewsArchive Pro</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <Link to="/collections" className="nav-link">
                Collections
              </Link>
              <Link to="/processing" className="nav-link">
                Processing
              </Link>
            </>
          ) : (
            <>
              <Link to="/features" className="nav-link">
                Features
              </Link>
              <Link to="/pricing" className="nav-link">
                Pricing
              </Link>
              <Link to="/about" className="nav-link">
                About
              </Link>
            </>
          )}
        </nav>

        {/* User Actions */}
        <div className="header-actions">
          {user ? (
            <div className="user-menu">
              <button
                onClick={toggleProfileMenu}
                className="user-button"
                aria-expanded={isProfileMenuOpen}
              >
                <UserIcon className="user-icon" />
                <span className="user-name">
                  {user.user_metadata?.first_name || user.email}
                </span>
              </button>
              
              {isProfileMenuOpen && (
                <div className="profile-dropdown">
                  <Link to="/profile" className="dropdown-item">
                    <UserIcon className="dropdown-icon" />
                    Profile
                  </Link>
                  <Link to="/settings" className="dropdown-item">
                    <Cog6ToothIcon className="dropdown-icon" />
                    Settings
                  </Link>
                  <button onClick={handleSignOut} className="dropdown-item">
                    <ArrowRightOnRectangleIcon className="dropdown-icon" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-actions">
              <Link to="/login" className="auth-link">
                Sign In
              </Link>
              <Link to="/register" className="auth-button">
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="mobile-menu-button"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <XMarkIcon className="mobile-menu-icon" />
            ) : (
              <Bars3Icon className="mobile-menu-icon" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="mobile-nav">
          {user ? (
            <>
              <Link to="/dashboard" className="mobile-nav-link">
                Dashboard
              </Link>
              <Link to="/collections" className="mobile-nav-link">
                Collections
              </Link>
              <Link to="/processing" className="mobile-nav-link">
                Processing
              </Link>
              <Link to="/profile" className="mobile-nav-link">
                Profile
              </Link>
              <Link to="/settings" className="mobile-nav-link">
                Settings
              </Link>
              <button onClick={handleSignOut} className="mobile-nav-button">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/features" className="mobile-nav-link">
                Features
              </Link>
              <Link to="/pricing" className="mobile-nav-link">
                Pricing
              </Link>
              <Link to="/about" className="mobile-nav-link">
                About
              </Link>
              <div className="mobile-auth-actions">
                <Link to="/login" className="mobile-auth-link">
                  Sign In
                </Link>
                <Link to="/register" className="mobile-auth-button">
                  Sign Up
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}

export default Header