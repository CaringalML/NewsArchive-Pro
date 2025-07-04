import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
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
  LanguageIcon
} from '@heroicons/react/24/outline'
import './Home.css'

const Home = () => {
  const { user } = useAuth()

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
                The world's leading AI-powered platform for digitizing, preserving, and sharing historical newspapers. 
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
      <section className="features">
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

      {/* Compliance Standards Section */}
      <section className="compliance">
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

      {/* AI/ML Technology Section */}
      <section className="technology">
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

      {/* About Section */}
      <section className="about">
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
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Preserve History?</h2>
            <p className="cta-subtitle">
              Join thousands of institutions worldwide using NewsArchive Pro to digitize and preserve their historical collections
            </p>
            <div className="cta-actions">
              {user ? (
                <Link to="/dashboard" className="btn btn-outline btn-lg">
                  Go to Dashboard
                  <ArrowRightIcon className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-outline btn-lg">
                    Start Free Trial
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                  <Link to="/contact" className="btn btn-outline btn-lg">
                    Contact Sales
                  </Link>
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