import React, { useState } from 'react'
import { 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  ChartBarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { useOCRJobs } from '../../hooks/useOCRJobs'
import { useUserManagement } from '../../hooks/useUserManagement'
import './OCRJobsPanel.css'

const OCRJobsPanel = () => {
  const { currentUser } = useUserManagement()
  const { 
    jobs, 
    loading, 
    error, 
    fetchJobs, 
    getJobStats, 
    getJobsByStatus, 
    getRecentJobs,
    isAutoRefreshing 
  } = useOCRJobs(currentUser?.user_id)

  const [selectedFilter, setSelectedFilter] = useState('all')
  const [showJobDetails, setShowJobDetails] = useState(null)

  const stats = getJobStats()

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      case 'processing':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A'
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const duration = end - start
    
    if (duration < 1000) return '< 1s'
    if (duration < 60000) return `${Math.round(duration / 1000)}s`
    if (duration < 3600000) return `${Math.round(duration / 60000)}m`
    return `${Math.round(duration / 3600000)}h`
  }

  const getFilteredJobs = () => {
    switch (selectedFilter) {
      case 'recent':
        return getRecentJobs()
      case 'pending':
        return getJobsByStatus('pending')
      case 'processing':
        return getJobsByStatus('processing')
      case 'completed':
        return getJobsByStatus('completed')
      case 'failed':
        return getJobsByStatus('failed')
      default:
        return jobs
    }
  }

  const filteredJobs = getFilteredJobs()

  if (!currentUser) {
    return (
      <div className="ocr-jobs-panel">
        <div className="panel-header">
          <h2>OCR Jobs</h2>
        </div>
        <div className="no-user-message">
          <p>Please initialize user to view OCR jobs</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ocr-jobs-panel">
      <div className="panel-header">
        <h2>OCR Jobs</h2>
        <div className="header-actions">
          {isAutoRefreshing && (
            <div className="auto-refresh-indicator">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              <span>Auto-refreshing</span>
            </div>
          )}
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="refresh-btn"
            title="Refresh jobs"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <ChartBarIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Jobs</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ClockIcon className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ArrowPathIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.processing}</div>
            <div className="stat-label">Processing</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="filter-section">
        <div className="filter-icon">
          <FunnelIcon className="w-5 h-5" />
        </div>
        <div className="filter-buttons">
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'recent', label: 'Recent', count: getRecentJobs().length },
            { key: 'pending', label: 'Pending', count: stats.pending },
            { key: 'processing', label: 'Processing', count: stats.processing },
            { key: 'completed', label: 'Completed', count: stats.completed },
            { key: 'failed', label: 'Failed', count: stats.failed }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={`filter-btn ${selectedFilter === filter.key ? 'active' : ''}`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="jobs-section">
        {loading && jobs.length === 0 ? (
          <div className="loading-message">
            <ArrowPathIcon className="w-6 h-6 animate-spin" />
            <p>Loading OCR jobs...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            <p>Error loading jobs: {error}</p>
            <button onClick={fetchJobs} className="retry-btn">
              Retry
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="no-jobs-message">
            <ChartBarIcon className="w-12 h-12 text-gray-400" />
            <p>No OCR jobs found</p>
            <p className="text-sm text-gray-500">
              {selectedFilter === 'all' 
                ? 'Upload some images to start processing' 
                : `No ${selectedFilter} jobs found`}
            </p>
          </div>
        ) : (
          <div className="jobs-list">
            {filteredJobs.map(job => (
              <div key={job.job_id} className={`job-item ${job.status}`}>
                <div className="job-status">
                  {getStatusIcon(job.status)}
                </div>
                
                <div className="job-info">
                  <div className="job-filename">{job.filename}</div>
                  <div className="job-details">
                    <span className="job-id">ID: {job.job_id.slice(0, 8)}...</span>
                    <span className="job-created">
                      Created: {formatDate(job.created_at)}
                    </span>
                    {job.completed_at && (
                      <span className="job-duration">
                        Duration: {formatDuration(job.created_at, job.completed_at)}
                      </span>
                    )}
                  </div>
                  
                  {job.error && (
                    <div className="job-error">
                      Error: {job.error}
                    </div>
                  )}
                  
                  {job.confidence_score && (
                    <div className="job-confidence">
                      Confidence: {Math.round(job.confidence_score)}%
                    </div>
                  )}
                </div>

                <div className="job-badge">
                  <span className={`status-badge ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>

                <div className="job-actions">
                  <button
                    onClick={() => setShowJobDetails(job.job_id)}
                    className="view-btn"
                    title="View details"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {showJobDetails && (
        <div className="modal-overlay" onClick={() => setShowJobDetails(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Job Details</h3>
              <button 
                onClick={() => setShowJobDetails(null)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            {(() => {
              const job = jobs.find(j => j.job_id === showJobDetails)
              if (!job) return <p>Job not found</p>
              
              return (
                <div className="modal-body">
                  <div className="job-detail-grid">
                    <div className="detail-item">
                      <label>Job ID:</label>
                      <span>{job.job_id}</span>
                    </div>
                    
                    <div className="detail-item">
                      <label>Filename:</label>
                      <span>{job.filename}</span>
                    </div>
                    
                    <div className="detail-item">
                      <label>Status:</label>
                      <span className={`status-badge ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <div className="detail-item">
                      <label>Created:</label>
                      <span>{formatDate(job.created_at)}</span>
                    </div>
                    
                    {job.completed_at && (
                      <div className="detail-item">
                        <label>Completed:</label>
                        <span>{formatDate(job.completed_at)}</span>
                      </div>
                    )}
                    
                    {job.confidence_score && (
                      <div className="detail-item">
                        <label>Confidence:</label>
                        <span>{Math.round(job.confidence_score)}%</span>
                      </div>
                    )}
                    
                    {job.document_type && (
                      <div className="detail-item">
                        <label>Document Type:</label>
                        <span>{job.document_type}</span>
                      </div>
                    )}
                    
                    {job.error && (
                      <div className="detail-item full-width">
                        <label>Error:</label>
                        <span className="error-text">{job.error}</span>
                      </div>
                    )}
                    
                    {job.extracted_text && (
                      <div className="detail-item full-width">
                        <label>Extracted Text:</label>
                        <div className="text-preview">
                          {job.extracted_text}
                        </div>
                      </div>
                    )}
                    
                    {job.corrected_text && (
                      <div className="detail-item full-width">
                        <label>Corrected Text:</label>
                        <div className="text-preview">
                          {job.corrected_text}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default OCRJobsPanel