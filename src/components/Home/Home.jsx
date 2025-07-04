import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  NewspaperIcon, 
  CloudArrowUpIcon, 
  MagnifyingGlassIcon, 
  ShareIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import './Home.css'

const Home = () => {
  const { user } = useAuth()

  const features = [
    {
      icon: CloudArrowUpIcon,
      title: 'Digital Archiving',
      description: 'Upload and digitize historical newspapers with advanced OCR technology'
    },
    {
      icon: MagnifyingGlassIcon,
      title: 'Advanced Search',
      description: 'Search through millions of pages with powerful full-text search capabilities'
    },
    {
      icon: ShareIcon,
      title: 'Easy Sharing',
      description: 'Share collections and collaborate with researchers worldwide'
    },
    {
      icon: CheckCircleIcon,
      title: 'Quality Assurance',
      description: 'Built-in quality control and validation tools for accurate digitization'
    }
  ]

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Preserve History with
                <span className="title-highlight"> NewsArchive Pro</span>
              </h1>
              <p className="hero-subtitle">
                The world's leading platform for digitizing, preserving, and sharing historical newspapers. 
                Trusted by libraries, universities, and cultural institutions worldwide.
              </p>
              <div className="hero-actions">
                {user ? (
                  <Link to="/dashboard" className="btn btn-primary btn-lg">
                    Go to Dashboard
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-primary btn-lg">
                      Get Started Free
                      <ArrowRightIcon className="w-5 h-5" />
                    </Link>
                    <Link to="/login" className="btn btn-outline btn-lg">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="hero-image">
              <div className="hero-card">
                <NewspaperIcon className="hero-icon" />
                <h3>NewsArchive Pro</h3>
                <p>Digitizing historical newspapers since 2002</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Choose NewsArchive Pro?</h2>
            <p className="section-subtitle">
              Built on 20+ years of experience in digital library technology
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home