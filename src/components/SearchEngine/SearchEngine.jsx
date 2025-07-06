import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  NewspaperIcon, 
  MagnifyingGlassIcon,
  SparklesIcon,
  ClockIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import './SearchEngine.css'

const SearchEngine = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', searchQuery)
      // For now, redirect to collections or search results page
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const quickSearches = [
    'World War I newspapers',
    'Local gazette 1920s',
    'Presidential elections',
    'Great Depression articles'
  ]

  const featuredCollections = [
    {
      title: 'New York Times Archive',
      period: '1851-2020',
      pages: '2.4M'
    },
    {
      title: 'Local Tribune Collection',
      period: '1890-1950',
      pages: '450K'
    },
    {
      title: 'Daily Herald Archives',
      period: '1900-1980',
      pages: '1.2M'
    }
  ]

  return (
    <div className="search-engine-page">
      {/* Header */}
      <header className="search-header">
        <div className="header-content">
          <Link to="/home" className="header-link">About</Link>
          <Link to="/register" className="header-link">Sign Up</Link>
          <Link to="/login" className="auth-button">Sign In</Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="search-main">
        <div className="search-container">
          {/* Logo */}
          <div className="logo-section">
            <div className="main-logo">
              <NewspaperIcon className="logo-icon" />
              <h1 className="logo-title">NewsArchive Pro</h1>
            </div>
            <p className="logo-subtitle">Search millions of historical newspapers</p>
          </div>

          {/* Search Bar */}
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className={`search-bar ${isSearchFocused ? 'focused' : ''}`}>
                <MagnifyingGlassIcon className="search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search historical newspapers, articles, and archives..."
                  className="search-input"
                  autoComplete="off"
                />
                <button type="submit" className="search-button">
                  Search
                </button>
              </div>
            </form>

            {/* Quick Searches */}
            <div className="quick-searches">
              <span className="quick-label">Popular searches:</span>
              {quickSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(search)
                    navigate(`/search?q=${encodeURIComponent(search)}`)
                  }}
                  className="quick-search-btn"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="stats-section">
            <div className="stat-item">
              <strong>50M+</strong> pages digitized
            </div>
            <div className="stat-item">
              <strong>1,200+</strong> institutions
            </div>
            <div className="stat-item">
              <strong>95+</strong> countries
            </div>
          </div>

          {/* Featured Collections */}
          <div className="featured-section">
            <h2 className="featured-title">Featured Collections</h2>
            <div className="featured-grid">
              {featuredCollections.map((collection, index) => (
                <div key={index} className="featured-card">
                  <div className="card-icon">
                    <NewspaperIcon className="w-6 h-6" />
                  </div>
                  <h3 className="card-title">{collection.title}</h3>
                  <div className="card-details">
                    <span className="detail-item">
                      <ClockIcon className="w-4 h-4" />
                      {collection.period}
                    </span>
                    <span className="detail-item">
                      <GlobeAltIcon className="w-4 h-4" />
                      {collection.pages} pages
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="features-section">
            <div className="feature-item">
              <SparklesIcon className="feature-icon" />
              <span>AI-Powered OCR</span>
            </div>
            <div className="feature-item">
              <MagnifyingGlassIcon className="feature-icon" />
              <span>Advanced Search</span>
            </div>
            <div className="feature-item">
              <NewspaperIcon className="feature-icon" />
              <span>Historical Archives</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="search-footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link to="/home">About NewsArchive Pro</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/help">Help</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="footer-info">
            <span>© 2024 NewsArchive Pro</span>
            <span>•</span>
            <Link to="/privacy">Privacy</Link>
            <span>•</span>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default SearchEngine