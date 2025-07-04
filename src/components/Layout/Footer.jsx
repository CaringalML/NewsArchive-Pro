import React from 'react'
import { Link } from 'react-router-dom'
import { 
  NewspaperIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import './Footer.css'

// Custom Social Media Icons as SVG components
const TwitterIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
  </svg>
)

const LinkedInIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const GitHubIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const productLinks = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Collections', href: '/collections' },
    { name: 'Processing', href: '/processing' },
    { name: 'API Documentation', href: '/docs' },
    { name: 'Integrations', href: '/integrations' }
  ]

  const companyLinks = [
    { name: 'About Us', href: '/about' },
    { name: 'Our Team', href: '/team' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press', href: '/press' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' }
  ]

  const supportLinks = [
    { name: 'Help Center', href: '/help' },
    { name: 'Documentation', href: '/docs' },
    { name: 'Status', href: '/status' },
    { name: 'Community', href: '/community' },
    { name: 'Training', href: '/training' },
    { name: 'Webinars', href: '/webinars' }
  ]

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
    { name: 'Security', href: '/security' },
    { name: 'Compliance', href: '/compliance' },
    { name: 'GDPR', href: '/gdpr' }
  ]

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-main">
          {/* Company Info */}
          <div className="footer-section company-info">
            <Link to="/" className="footer-logo">
              <NewspaperIcon className="footer-logo-icon" />
              <span className="footer-logo-text">NewsArchive Pro</span>
            </Link>
            <p className="footer-description">
              The world's leading platform for digitizing, preserving, and sharing historical newspapers. 
              Trusted by libraries, universities, and cultural institutions worldwide.
            </p>
            <div className="footer-contact">
              <div className="contact-item">
                <EnvelopeIcon className="contact-icon" />
                <a href="mailto:contact@newsarchivepro.com" className="contact-link">
                  contact@newsarchivepro.com
                </a>
              </div>
              <div className="contact-item">
                <PhoneIcon className="contact-icon" />
                <a href="tel:+1-555-0123" className="contact-link">
                  +1 (555) 012-3456
                </a>
              </div>
              <div className="contact-item">
                <MapPinIcon className="contact-icon" />
                <span className="contact-text">
                  Hamilton, New Zealand
                </span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div className="footer-section">
            <h3 className="footer-section-title">Product</h3>
            <ul className="footer-links">
              {productLinks.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="footer-link">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="footer-section">
            <h3 className="footer-section-title">Company</h3>
            <ul className="footer-links">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="footer-link">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div className="footer-section">
            <h3 className="footer-section-title">Support</h3>
            <ul className="footer-links">
              {supportLinks.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="footer-link">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="footer-section">
            <h3 className="footer-section-title">Legal</h3>
            <ul className="footer-links">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="footer-link">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="footer-newsletter">
          <div className="newsletter-content">
            <h3 className="newsletter-title">Stay Updated</h3>
            <p className="newsletter-description">
              Get the latest news on digital preservation and newspaper digitization.
            </p>
          </div>
          <form className="newsletter-form">
            <div className="newsletter-input-wrapper">
              <input
                type="email"
                placeholder="Enter your email"
                className="newsletter-input"
                required
              />
              <button type="submit" className="newsletter-button">
                Subscribe
              </button>
            </div>
            <p className="newsletter-privacy">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </form>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <p className="footer-copyright">
              © {currentYear} NewsArchive Pro. All rights reserved.
            </p>
            <div className="footer-badges">
              <span className="badge">METS/ALTO Compliant</span>
              <span className="badge">SOC 2 Type II</span>
              <span className="badge">GDPR Ready</span>
            </div>
          </div>
          
          <div className="footer-bottom-right">
            <div className="social-links">
              <a 
                href="https://twitter.com/newsarchivepro" 
                className="social-link"
                aria-label="Follow us on Twitter"
                target="_blank"
                rel="noopener noreferrer"
              >
                <TwitterIcon className="social-icon" />
              </a>
              <a 
                href="https://linkedin.com/company/newsarchivepro" 
                className="social-link"
                aria-label="Follow us on LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkedInIcon className="social-icon" />
              </a>
              <a 
                href="https://github.com/newsarchivepro" 
                className="social-link"
                aria-label="Follow us on GitHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon className="social-icon" />
              </a>
            </div>
            
            <div className="footer-lang-selector">
              <select className="lang-select">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer