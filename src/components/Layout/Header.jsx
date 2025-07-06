import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  NewspaperIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import './Header.css';

const Header = () => {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Centralized sign-out logic
  const handleSignOut = async () => {
    await signOut();
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    navigate('/home');
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  // Close mobile menu, e.g., after a link is clicked
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  }

  // Close profile menu when mobile menu is toggled
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsProfileMenuOpen(false);
    }
  }, [isMobileMenuOpen]);
  
  // Prevent body scroll when mobile menu is open for a better user experience
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup function to reset the style when the component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Reusable function to render navigation links for both desktop and mobile
  const renderNavLinks = (isMobile = false) => {
    const linkClass = isMobile ? 'mobile-nav-link' : 'nav-link';
    // Define links based on user authentication status
    const links = user
      ? [
          { to: '/dashboard', text: 'Dashboard' },
          { to: '/collections', text: 'Collections' },
          { to: '/processing', text: 'Processing' },
        ]
      : [
          { to: '/features',text: 'Features' },
          { to: '/pricing', text: 'Pricing' },
          { to: '/about', text: 'About' },
        ];

    return links.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        className={({ isActive }) => `${linkClass} ${isActive ? 'active' : ''}`}
        onClick={closeMobileMenu}
      >
        {link.text}
      </NavLink>
    ));
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo - always visible */}
        <div className="header-logo">
          <Link to="/" className="logo-link" onClick={closeMobileMenu}>
            <NewspaperIcon className="logo-icon" />
            <span className="logo-text">NewsArchive Pro</span>
          </Link>
        </div>

        {/* Desktop Navigation & Actions */}
        <div className="desktop-header-content">
          <nav className="desktop-nav">{renderNavLinks()}</nav>
          <div className="header-actions">
            {user ? (
              <div className="user-menu">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="user-button"
                  aria-expanded={isProfileMenuOpen}
                  aria-label="User menu"
                >
                  <UserIcon className="user-icon" />
                  <span className="user-name">
                    {user.user_metadata?.first_name || user.email.split('@')[0]}
                  </span>
                </button>
                {isProfileMenuOpen && (
                  <div className="profile-dropdown">
                    <Link to="/profile" className="dropdown-item" onClick={() => setIsProfileMenuOpen(false)}>
                      <UserIcon className="dropdown-icon" /> Profile
                    </Link>
                    <Link to="/settings" className="dropdown-item" onClick={() => setIsProfileMenuOpen(false)}>
                      <Cog6ToothIcon className="dropdown-icon" /> Settings
                    </Link>
                    <button onClick={handleSignOut} className="dropdown-item">
                      <ArrowRightOnRectangleIcon className="dropdown-icon" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-actions">
                <Link to="/login" className="auth-link">Sign In</Link>
                <Link to="/register" className="auth-button">Sign Up</Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="mobile-menu-container">
            <button
                onClick={toggleMobileMenu}
                className="mobile-menu-button"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
            >
                {isMobileMenuOpen ? (
                <XMarkIcon className="mobile-menu-icon" />
                ) : (
                <Bars3Icon className="mobile-menu-icon" />
                )}
            </button>
        </div>
      </div>

      {/* Mobile Navigation Panel - Slides in from the side */}
      <div className={`mobile-nav-panel ${isMobileMenuOpen ? 'open' : ''}`}>
          <nav className="mobile-nav-links">
            {renderNavLinks(true)}
          </nav>
          <div className="mobile-nav-footer">
            {user ? (
                <>
                    <Link to="/profile" className="mobile-nav-link" onClick={closeMobileMenu}>
                        <UserIcon className="dropdown-icon" /> Profile
                    </Link>
                    <Link to="/settings" className="mobile-nav-link" onClick={closeMobileMenu}>
                        <Cog6ToothIcon className="dropdown-icon" /> Settings
                    </Link>
                    <button onClick={handleSignOut} className="mobile-nav-button">
                        <ArrowRightOnRectangleIcon className="dropdown-icon" /> Sign Out
                    </button>
                </>
            ) : (
                <div className="mobile-auth-actions">
                    <Link to="/login" className="mobile-auth-link" onClick={closeMobileMenu}>Sign In</Link>
                    <Link to="/register" className="mobile-auth-button" onClick={closeMobileMenu}>Sign Up</Link>
                </div>
            )}
          </div>
      </div>
    </header>
  );
};

export default Header;