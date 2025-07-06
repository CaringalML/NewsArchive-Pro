import React, { useState, useEffect, useMemo } from 'react'
import {
  NewspaperIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  CpuChipIcon,
  EyeIcon,
  LanguageIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import './Home.css'

const Home = () => {
  const user = null // Mock user state for demo
  const [activeSection, setActiveSection] = useState('hero')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const sections = useMemo(() => [
    { id: 'hero', label: 'Home' },
    { id: 'features', label: 'Features' },
    { id: 'technology', label: 'Technology' },
    { id: 'compliance', label: 'Standards' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Get Started' }
  ], [])

  const features = [
    {
      icon: CloudArrowUpIcon,
      title: 'AI-Powered Processing',
      description: 'Advanced OCR and text recognition powered by AWS Textract and Comprehend'
    },
    {
      icon: MagnifyingGlassIcon,
      title: 'Intelligent Search',
      description: 'Search through millions of pages with AI-enhanced full-text search capabilities'
    },
    {
      icon: ShareIcon,
      title: 'Standards Compliant',
      description: 'METS/ALTO compliant digital preservation with industry-standard metadata'
    },
    {
      icon: CheckCircleIcon,
      title: 'Quality Assurance',
      description: 'Built-in quality control and validation tools for accurate digitization'
    }
  ]

  const complianceStandards = [
    {
      icon: DocumentCheckIcon,
      name: 'METS/ALTO',
      description: 'Metadata Encoding & Transmission Standard with Analyzed Layout Text Object'
    },
    {
      icon: ShieldCheckIcon,
      name: 'Dublin Core',
      description: 'International standard for cross-domain resource description'
    },
    {
      icon: CheckCircleIcon,
      name: 'ISO 21500',
      description: 'International standards for digital preservation and project management'
    }
  ]

  const technologies = [
    {
      icon: EyeIcon,
      title: 'AWS Textract',
      description: 'Machine learning service that automatically extracts text, handwriting, and data from scanned documents.',
      features: [
        'OCR for printed and handwritten text',
        'Table and form data extraction',
        'Layout and formatting preservation',
        'Multi-language support'
      ]
    },
    {
      icon: CpuChipIcon,
      title: 'AWS Comprehend',
      description: 'Natural language processing service that uses machine learning to find insights and relationships in text.',
      features: [
        'Entity recognition and classification',
        'Sentiment analysis',
        'Language detection',
        'Topic modeling and categorization'
      ]
    },
    {
      icon: LanguageIcon,
      title: 'Multi-Language Processing',
      description: 'Support for multiple languages and historical text variations with specialized models.',
      features: [
        'Historical language variants',
        'Gothic and Fraktur fonts',
        'Multi-script document processing',
        'Custom model training'
      ]
    }
  ]

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
      setActiveSection(sectionId)
      setIsMobileNavOpen(false)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const offsetTop = element.offsetTop
          const offsetHeight = element.offsetHeight

          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections])

  return (
    <div className="home-page">
      {/* Fixed Navigation */}
      <nav className="fixed-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <NewspaperIcon className="nav-logo" />
            <span className="nav-brand-text">NewsArchive Pro</span>
          </div>

          {/* Desktop Navigation */}
          <div className="nav-links desktop-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`nav-link ${activeSection === section.id ? 'active' : ''}`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Mobile Navigation Toggle */}
          <button
            className="mobile-nav-toggle"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          >
            {isMobileNavOpen ? <XMarkIcon className="nav-icon" /> : <Bars3Icon className="nav-icon" />}
          </button>

          {/* Mobile Navigation Menu */}
          <div className={`mobile-nav ${isMobileNavOpen ? 'open' : ''}`}>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`mobile-nav-link ${activeSection === section.id ? 'active' : ''}`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Preserve History with
                <span className="title-highlight"> NewsArchive Pro</span>
              </h1>
              <p className="hero-subtitle">
                The world's leading AI-powered platform for digitizing, preserving, and sharing historical newspapers.
                Trusted by libraries, universities, and cultural institutions worldwide.
              </p>
              <div className="hero-actions">
                {user ? (
                  <a href="/dashboard" className="btn btn-primary btn-lg">
                    Go to Dashboard
                    <ArrowRightIcon className="w-5 h-5" />
                  </a>
                ) : (
                  <>
                    <a href="/register" className="btn btn-primary btn-lg">
                      Get Started Free
                      <ArrowRightIcon className="w-5 h-5" />
                    </a>
                    <a href="/login" className="btn btn-outline btn-lg">
                      Sign In
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="hero-image">
              <div className="hero-card">
                <NewspaperIcon className="hero-icon" />
                <h3>NewsArchive Pro</h3>
                <p>AI-powered digitization since 2002</p>
                <div className="hero-stats">
                  <div className="stat-item">
                    <div className="stat-number">50M+</div>
                    <div className="stat-label">Pages Processed</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">1,200+</div>
                    <div className="stat-label">Institutions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Choose NewsArchive Pro?</h2>
            <p className="section-subtitle">
              Built on 20+ years of experience in digital library technology with cutting-edge AI
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

      {/* AI/ML Technology Section */}
      <section id="technology" className="technology">
        <div className="container">
          <div className="technology-header">
            <h2 className="technology-title">Powered by Advanced AI & Machine Learning</h2>
            <p className="technology-subtitle">
              Leveraging Amazon Web Services' cutting-edge AI technologies for superior accuracy and efficiency
            </p>
          </div>
          <div className="technology-grid">
            {technologies.map((tech, index) => (
              <div key={index} className="tech-card">
                <div className="tech-icon">
                  <tech.icon className="w-8 h-8" />
                </div>
                <h3 className="tech-title">{tech.title}</h3>
                <p className="tech-description">{tech.description}</p>
                <ul className="tech-features">
                  {tech.features.map((feature, featureIndex) => (
                    <li key={featureIndex}>{feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="aws-powered">
            <div className="aws-logo">⚡ Powered by Amazon Web Services</div>
            <p className="aws-description">
              Built on AWS infrastructure with enterprise-grade security, scalability, and reliability.
              Our AI-powered processing pipeline ensures the highest quality digitization results.
            </p>
          </div>
        </div>
      </section>

      {/* Compliance Standards Section */}
      <section id="compliance" className="compliance">
        <div className="container">
          <div className="compliance-content">
            <div className="compliance-text">
              <h2 className="compliance-title">Industry Standard Compliance</h2>
              <p className="compliance-subtitle">
                Our platform adheres to international standards for digital preservation,
                ensuring your collections are future-proof and interoperable with other systems.
              </p>
            </div>
            <div className="compliance-standards">
              {complianceStandards.map((standard, index) => (
                <div key={index} className="standard-card">
                  <div className="standard-icon">
                    <standard.icon className="w-6 h-6" />
                  </div>
                  <h3 className="standard-name">{standard.name}</h3>
                  <p className="standard-description">{standard.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Choose Your Plan</h2>
            <p className="section-subtitle">
              Flexible pricing options designed for institutions of all sizes
            </p>
          </div>

          <div className="pricing-toggle">
            <div className="toggle-container">
              <span className="toggle-label">Monthly</span>
              <button className="toggle-switch">
                <div className="toggle-slider"></div>
              </button>
              <span className="toggle-label">Annual <span className="savings-badge">Save 20%</span></span>
            </div>
          </div>

          <div className="pricing-grid">
            {/* Starter Plan */}
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="plan-name">Starter</h3>
                <p className="plan-description">Perfect for small institutions getting started</p>
                <div className="plan-price">
                  <span className="currency">$</span>
                  <span className="amount">299</span>
                  <span className="period">/month</span>
                </div>
                <p className="price-note">Up to 10,000 pages/month</p>
              </div>
              <div className="pricing-features">
                <h4 className="features-title">What's included:</h4>
                <ul className="features-list">
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>AI-powered OCR processing</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>METS/ALTO metadata generation</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Basic search functionality</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>5GB cloud storage</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Email support</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Standard quality assurance</span>
                  </li>
                </ul>
              </div>
              <div className="pricing-footer">
                <button className="pricing-btn btn-outline">Start Free Trial</button>
                <p className="trial-note">14-day free trial • No credit card required</p>
              </div>
            </div>

            {/* Professional Plan - Popular */}
            <div className="pricing-card popular">
              <div className="popular-badge">Most Popular</div>
              <div className="pricing-header">
                <h3 className="plan-name">Professional</h3>
                <p className="plan-description">Ideal for medium-sized libraries and archives</p>
                <div className="plan-price">
                  <span className="currency">$</span>
                  <span className="amount">799</span>
                  <span className="period">/month</span>
                </div>
                <p className="price-note">Up to 50,000 pages/month</p>
              </div>
              <div className="pricing-features">
                <h4 className="features-title">Everything in Starter, plus:</h4>
                <ul className="features-list">
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Advanced AI text analysis</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Custom metadata schemas</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>API access for integrations</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>50GB cloud storage</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Priority phone & email support</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Advanced analytics dashboard</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Batch processing tools</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Custom workflows</span>
                  </li>
                </ul>
              </div>
              <div className="pricing-footer">
                <button className="pricing-btn btn-primary">Start Free Trial</button>
                <p className="trial-note">14-day free trial • No credit card required</p>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="plan-name">Enterprise</h3>
                <p className="plan-description">For large institutions with complex needs</p>
                <div className="plan-price">
                  <span className="amount">Custom</span>
                </div>
                <p className="price-note">Unlimited pages & custom solutions</p>
              </div>
              <div className="pricing-features">
                <h4 className="features-title">Everything in Professional, plus:</h4>
                <ul className="features-list">
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Unlimited processing capacity</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Dedicated AWS infrastructure</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Custom AI model training</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Unlimited cloud storage</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>24/7 dedicated support</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>Custom integrations</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>On-premise deployment option</span>
                  </li>
                  <li>
                    <CheckCircleIcon className="feature-check" />
                    <span>SLA guarantees</span>
                  </li>
                </ul>
              </div>
              <div className="pricing-footer">
                <button className="pricing-btn btn-outline">Contact Sales</button>
                <p className="trial-note">Custom pricing • Volume discounts available</p>
              </div>
            </div>
          </div>

          {/* Pricing FAQ */}
          <div className="pricing-faq">
            <h3 className="faq-title">Frequently Asked Questions</h3>
            <div className="faq-grid">
              <div className="faq-item">
                <h4 className="faq-question">What happens if I exceed my monthly page limit?</h4>
                <p className="faq-answer">
                  You'll receive notifications as you approach your limit. Additional pages are processed at $0.05 per page,
                  or you can upgrade to a higher tier plan at any time.
                </p>
              </div>
              <div className="faq-item">
                <h4 className="faq-question">Can I cancel my subscription anytime?</h4>
                <p className="faq-answer">
                  Yes, you can cancel your subscription at any time. Your account will remain active until the end of your
                  current billing period, and you'll retain access to your processed content.
                </p>
              </div>
              <div className="faq-item">
                <h4 className="faq-question">Do you offer educational discounts?</h4>
                <p className="faq-answer">
                  Yes! We offer special pricing for educational institutions, libraries, and non-profit organizations.
                  Contact our sales team for more information about available discounts.
                </p>
              </div>
              <div className="faq-item">
                <h4 className="faq-question">What formats do you support?</h4>
                <p className="faq-answer">
                  We support TIFF, JPEG, PNG, and PDF files. Our AI can process both high-quality scans and
                  lower-resolution images, with automatic quality enhancement where needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2 className="about-title">Preserving Cultural Heritage</h2>
              <p className="about-description">
                For over two decades, NewsArchive Pro has been at the forefront of digital preservation technology,
                helping institutions worldwide safeguard their historical newspaper collections for future generations.
              </p>
              <div className="about-highlights">
                <div className="highlight">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <span>20+ years of proven experience</span>
                </div>
                <div className="highlight">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <span>99.8% OCR accuracy with AI enhancement</span>
                </div>
                <div className="highlight">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <span>SOC 2 Type II certified infrastructure</span>
                </div>
                <div className="highlight">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <span>24/7 expert support and training</span>
                </div>
              </div>
            </div>
            <div className="about-card">
              <h3 className="card-title">Global Impact</h3>
              <div className="impact-stats">
                <div className="impact-item">
                  <div className="impact-number">50M+</div>
                  <div className="impact-label">Pages Digitized</div>
                </div>
                <div className="impact-item">
                  <div className="impact-number">1,200+</div>
                  <div className="impact-label">Institutions</div>
                </div>
                <div className="impact-item">
                  <div className="impact-number">95+</div>
                  <div className="impact-label">Countries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Preserve History?</h2>
            <p className="cta-subtitle">
              Join thousands of institutions worldwide using NewsArchive Pro to digitize and preserve their historical collections
            </p>
            <div className="cta-actions">
              {user ? (
                <a href="/dashboard" className="btn btn-outline btn-lg">
                  Go to Dashboard
                  <ArrowRightIcon className="w-5 h-5" />
                </a>
              ) : (
                <>
                  <a href="/register" className="btn btn-outline btn-lg">
                    Start Free Trial
                    <ArrowRightIcon className="w-5 h-5" />
                  </a>
                  <button
                    onClick={() => scrollToSection('contact')}
                    className="btn btn-outline btn-lg"
                  >
                    Contact Sales
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home