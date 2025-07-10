import React, { useState, useEffect } from 'react'
import { 
  ClockIcon, 
  XCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChartPieIcon,
  BoltIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { useRealtimeOCR } from '../../hooks/useRealtimeOCR'
import { useUserManagement } from '../../hooks/useUserManagement'
import MetadataDisplay from '../Common/MetadataDisplay'
import './RealtimeDashboard.css'

const RealtimeDashboard = () => {
  const { currentUser } = useUserManagement()
  const { jobs, stats, refresh, isPolling, lastUpdate } = useRealtimeOCR(currentUser?.user_id)
  const [filter, setFilter] = useState('all')
  const [animatedStats, setAnimatedStats] = useState(stats)
  const [selectedJob, setSelectedJob] = useState(null)

  // Animate stat changes
  useEffect(() => {
    const animateValue = (key, start, end, duration = 500) => {
      const increment = (end - start) / (duration / 16)
      let current = start
      
      const timer = setInterval(() => {
        current += increment
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
          current = end
          clearInterval(timer)
        }
        setAnimatedStats(prev => ({ ...prev, [key]: Math.round(current) }))
      }, 16)
    }

    // Animate each stat change
    Object.keys(stats).forEach(key => {
      if (typeof stats[key] === 'number' && animatedStats[key] !== stats[key]) {
        animateValue(key, animatedStats[key] || 0, stats[key])
      }
    })
  }, [stats, animatedStats])

  // Filter jobs based on selected filter
  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true
    return job.status === filter
  })

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'status-completed'
      case 'processing': return 'status-processing animate-pulse'
      case 'pending': 
      case 'queued': return 'status-pending'
      case 'failed': return 'status-failed'
      default: return 'status-default'
    }
  }

  // Job progress bar component
  const JobProgressBar = ({ job }) => {
    if (job.status !== 'processing') return null
    
    const progress = job.progress || 0
    
    return (
      <div className="job-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          >
            <div className="animate-shimmer" />
          </div>
        </div>
        <p className="progress-text">{progress}% complete</p>
      </div>
    )
  }

  return (
    <div className="realtime-dashboard">
      {/* Header with live indicator */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">OCR Processing Center</h1>
          <div className="live-indicator">
            <span className={`live-dot ${isPolling ? 'pulse' : ''}`} />
            <span className="live-text">
              {isPolling ? 'Live' : 'Paused'}
            </span>
            {lastUpdate && (
              <span className="last-update">
                Updated {formatRelativeTime(lastUpdate)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={refresh}
          className="refresh-button"
          title="Refresh now"
        >
          <ArrowPathIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Animated Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-total">
            <ChartPieIcon className="w-7 h-7" />
            <div className="stat-icon-glow"></div>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Total Jobs</h3>
            <p className="stat-value">{animatedStats.total}</p>
            <p className="stat-trend">📊 Overview</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-pending">
            <ClockIcon className="w-7 h-7" />
            <div className="stat-icon-pulse-ring"></div>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">In Queue</h3>
            <p className="stat-value">{animatedStats.pending}</p>
            <p className="stat-trend">⏳ Waiting</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-processing">
            <BoltIcon className="w-7 h-7" />
            <div className="stat-icon-lightning"></div>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Processing</h3>
            <p className="stat-value">{animatedStats.processing}</p>
            <p className="stat-trend">⚡ Active</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-completed">
            <StarIcon className="w-7 h-7" />
            <div className="stat-icon-sparkle"></div>
          </div>
          <div className="stat-content">
            <h3 className="stat-label">Completed</h3>
            <p className="stat-value">{animatedStats.completed}</p>
            {animatedStats.total > 0 && (
              <p className="stat-subtext">⭐ {animatedStats.successRate}% success</p>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['all', 'pending', 'processing', 'completed', 'failed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`filter-tab ${filter === status ? 'active' : ''}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="filter-count">
                {jobs.filter(j => j.status === status).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Jobs List with animations */}
      <div className="jobs-container">
        {filteredJobs.length === 0 ? (
          <div className="empty-state">
            <SparklesIcon className="w-12 h-12 text-gray-400" />
            <h3>No jobs found</h3>
            <p>Upload some images to start processing!</p>
          </div>
        ) : (
          <div className="jobs-list">
            {filteredJobs.map((job, index) => (
              <div 
                key={job.job_id} 
                className={`job-card ${job.optimistic ? 'optimistic' : ''}`}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <div className="job-header">
                  <div className="job-info">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <h4 className="job-filename">{job.filename}</h4>
                      <p className="job-time">{formatRelativeTime(job.created_at)}</p>
                    </div>
                  </div>
                  <div className={`job-status ${getStatusColor(job.status)}`}>
                    {job.status}
                  </div>
                </div>

                <JobProgressBar job={job} />

                {job.status === 'completed' && (
                  <div className="job-preview">
                    {job.corrected_text && (
                      <p className="preview-text">
                        {job.corrected_text.substring(0, 100)}...
                      </p>
                    )}
                    <div className="job-stats">
                      <span className="confidence">
                        {Math.round((job.confidence_score || 0) * 100)}% confidence
                      </span>
                      {job.correction_model && (
                        <span className="model">
                          {job.correction_model}
                        </span>
                      )}
                      {job.comprehend_processed && (
                        <button 
                          className="metadata-btn"
                          onClick={() => setSelectedJob(job)}
                          title="View AI Analysis"
                        >
                          <SparklesIcon className="w-4 h-4" />
                          AI Analysis
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {job.status === 'failed' && job.error && (
                  <div className="job-error">
                    <XCircleIcon className="w-4 h-4" />
                    <span>{job.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata Modal */}
      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <SparklesIcon className="w-5 h-5 inline mr-2" />
                AI Analysis - {selectedJob.filename}
              </h3>
              <button 
                onClick={() => setSelectedJob(null)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <MetadataDisplay metadata={selectedJob.metadata_summary} />
              
              {selectedJob.corrected_text && (
                <div className="text-section">
                  <h4>Processed Text:</h4>
                  <div className="text-preview">
                    {selectedJob.corrected_text}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RealtimeDashboard