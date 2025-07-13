import React, { useState } from 'react'
import { 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  ChartBarIcon,
  FunnelIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { useOCRJobs } from '../../hooks/useOCRJobs'
import { useUserManagement } from '../../hooks/useUserManagement'
import { apiService } from '../../services/api'
import MetadataDisplay from '../Common/MetadataDisplay'
import './OCRJobsPanel.css'

const JobDetailsModalContent = ({ showJobDetails, jobs, getStatusColor, formatDate, fetchGroupedDocument }) => {
  const [groupedData, setGroupedData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  // Find the job (could be single job or grouped job)
  const job = jobs.find(j => j.job_id === showJobDetails || j.group_id === showJobDetails)
  
  React.useEffect(() => {
    const loadGroupedData = async () => {
      if (job && job.is_grouped && job.group_id) {
        setLoading(true)
        try {
          const data = await fetchGroupedDocument(job.group_id)
          setGroupedData(data)
        } catch (error) {
          console.error('Failed to load grouped document:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setGroupedData(null)
      }
    }

    loadGroupedData()
  }, [job, fetchGroupedDocument])

  if (!job) return <div className="modal-body"><p>Job not found</p></div>

  const isGrouped = job.is_grouped && groupedData
  const displayData = isGrouped ? groupedData : job

  return (
    <div className="modal-body">
      {/* Job Info Section */}
      <div className="job-info-section">
        <div className="job-detail-grid">
          <div className="detail-item">
            <label>{isGrouped ? 'Group ID:' : 'Job ID:'}</label>
            <span>{isGrouped ? job.group_id : job.job_id}</span>
          </div>
          
          <div className="detail-item">
            <label>Document:</label>
            <span>{job.filename}</span>
          </div>

          {isGrouped && (
            <div className="detail-item">
              <label>Total Pages:</label>
              <span>{displayData.total_pages}</span>
            </div>
          )}
          
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
              <label>{isGrouped ? 'Avg Confidence:' : 'Confidence:'}</label>
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
            <div className="detail-item">
              <label>Error:</label>
              <span className="error-text">{job.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Combined Text Content Section for Grouped Documents */}
      {isGrouped && displayData.combined_text && (
        <div className="text-content-section">
          <div className="section-header">
            <DocumentTextIcon className="w-5 h-5" />
            <h3>Combined Text from All Pages</h3>
            <span className="page-count-badge">{displayData.total_pages} pages</span>
          </div>
          <div className="text-content">
            <div className="text-block">
              <div className="text-preview multi-page">
                {displayData.combined_text}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Page Text Content for Single Jobs */}
      {!isGrouped && (job.extracted_text || job.corrected_text) && (
        <div className="text-content-section">
          <div className="text-content">
            {job.extracted_text && (
              <div className="text-block">
                <label>Extracted Text:</label>
                <div className="text-preview">
                  {job.extracted_text}
                </div>
              </div>
            )}
            
            {job.corrected_text && (
              <div className="text-block">
                <label>Corrected Text:</label>
                <div className="text-preview">
                  {job.corrected_text}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Individual Pages Section for Grouped Documents */}
      {isGrouped && displayData.pages && (
        <div className="pages-section">
          <div className="section-header">
            <DocumentTextIcon className="w-5 h-5" />
            <h3>Individual Pages</h3>
            <span className="pages-summary">
              {displayData.pages.filter(p => p.status === 'completed').length} of {displayData.pages.length} completed
            </span>
          </div>
          <div className="pages-grid">
            {displayData.pages.map((page, index) => (
              <div key={page.job_id} className="page-card enhanced">
                <div className="page-header">
                  <div className="page-title">
                    <h4>Page {page.page_number || index + 1}</h4>
                    <span className="page-filename">{page.filename}</span>
                  </div>
                  <span className={`status-badge ${getStatusColor(page.status)}`}>
                    {page.status}
                  </span>
                </div>
                
                <div className="page-stats">
                  {page.confidence_score && (
                    <div className="stat-item">
                      <span className="stat-label">Confidence:</span>
                      <span className="stat-value">{Math.round(page.confidence_score)}%</span>
                    </div>
                  )}
                  {page.created_at && (
                    <div className="stat-item">
                      <span className="stat-label">Processed:</span>
                      <span className="stat-value">{formatDate(page.created_at)}</span>
                    </div>
                  )}
                </div>

                {page.error && (
                  <div className="page-error-banner">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>{page.error}</span>
                  </div>
                )}

                {(page.corrected_text || page.extracted_text) && (
                  <div className="page-text-preview">
                    <label className="preview-label">Text Preview:</label>
                    <div className="text-preview small">
                      {(page.corrected_text || page.extracted_text).substring(0, 200)}
                      {(page.corrected_text || page.extracted_text).length > 200 && '...'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-section">
          <ArrowPathIcon className="w-6 h-6 animate-spin" />
          <p>Loading multi-page document...</p>
        </div>
      )}
      
      {job.comprehend_processed && (
        <div className="ai-metadata-section">
          <label>
            <SparklesIcon className="w-5 h-5" />
            AI Metadata Analysis
          </label>
          <MetadataDisplay metadata={job.metadata_summary} />
        </div>
      )}
    </div>
  )
}

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
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [groupedDocuments, setGroupedDocuments] = useState({})

  const stats = getJobStats()

  const toggleGroupExpansion = (groupId) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const fetchGroupedDocument = async (groupId) => {
    if (groupedDocuments[groupId]) {
      return groupedDocuments[groupId]
    }

    try {
      const response = await apiService.getMultiPageDocument(groupId)
      const groupData = response.data
      setGroupedDocuments(prev => ({
        ...prev,
        [groupId]: groupData
      }))
      return groupData
    } catch (error) {
      console.error('Failed to fetch grouped document:', error)
      return null
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      case 'processing':
        return <ArrowPathIcon className="w-5 h-5 text-green-500 animate-spin" />
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
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  // Group jobs by group_id for multi-page documents
  const groupJobs = (jobsList) => {
    const groupedJobs = {}
    const singleJobs = []

    jobsList.forEach(job => {
      // Group jobs that have a group_id (multi-page documents)
      if (job.group_id) {
        // Ensure group_id is a string
        const groupId = job.group_id.toString()
        
        if (!groupedJobs[groupId]) {
          groupedJobs[groupId] = {
            group_id: groupId,
            is_grouped: true,
            pages: [],
            // Use first job data as base for group
            job_id: job.job_id,
            created_at: job.created_at,
            filename: job.collection_name || job.filename || 'Multi-page Document',
            collection_name: job.collection_name,
            // Group status is derived from all pages
            status: 'processing', // Will be calculated
            // Processing route (use first page route or determine overall)
            processing: job.processing
          }
        }
        groupedJobs[groupId].pages.push(job)
      } else {
        // Single page jobs
        singleJobs.push(job)
      }
    })

    // Calculate group status and update group metadata
    Object.values(groupedJobs).forEach(group => {
      const pages = group.pages.sort((a, b) => (a.page_number || 0) - (b.page_number || 0))
      
      // Determine overall status
      const statuses = pages.map(p => p.status)
      if (statuses.every(s => s === 'completed')) {
        group.status = 'completed'
      } else if (statuses.some(s => s === 'failed')) {
        group.status = 'failed'
      } else if (statuses.some(s => s === 'processing')) {
        group.status = 'processing'
      } else {
        group.status = 'pending'
      }

      // Use earliest creation time
      group.created_at = pages.reduce((earliest, page) => 
        new Date(page.created_at) < new Date(earliest) ? page.created_at : earliest
      , pages[0].created_at)

      // Use latest completion time if all completed
      if (group.status === 'completed') {
        group.completed_at = pages.reduce((latest, page) => 
          page.completed_at && new Date(page.completed_at) > new Date(latest || 0) ? page.completed_at : latest
        , null)
      }

      // Update filename to show page count and status summary
      const statusSummary = {
        completed: pages.filter(p => p.status === 'completed').length,
        processing: pages.filter(p => p.status === 'processing').length,
        pending: pages.filter(p => p.status === 'pending' || p.status === 'queued').length,
        failed: pages.filter(p => p.status === 'failed').length
      }
      
      group.filename = `${group.collection_name || 'Multi-page Document'} (${pages.length} pages)`
      group.statusSummary = statusSummary
      
      // Calculate combined confidence if available
      const confidenceScores = pages.filter(p => p.confidence_score).map(p => p.confidence_score)
      if (confidenceScores.length > 0) {
        group.confidence_score = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      }

      // Check if any page has AI processing
      group.comprehend_processed = pages.some(p => p.comprehend_processed)
      
      // Combine any errors
      const errors = pages.filter(p => p.error).map(p => p.error)
      if (errors.length > 0) {
        group.error = `${errors.length} page(s) failed: ${errors[0]}${errors.length > 1 ? '...' : ''}`
      }
    })

    // Sort grouped jobs by creation date (newest first)
    const sortedGroupedJobs = Object.values(groupedJobs).sort((a, b) => {
      const dateA = new Date(a.created_at)
      const dateB = new Date(b.created_at)
      return dateB - dateA // Descending order (newest first)
    })

    // Sort single jobs by creation date (newest first)
    const sortedSingleJobs = singleJobs.sort((a, b) => {
      const dateA = new Date(a.created_at)
      const dateB = new Date(b.created_at)
      return dateB - dateA // Descending order (newest first)
    })

    // Combine and sort all jobs by creation date (newest first)
    const finalResult = [...sortedSingleJobs, ...sortedGroupedJobs].sort((a, b) => {
      const dateA = new Date(a.created_at)
      const dateB = new Date(b.created_at)
      return dateB - dateA // Descending order (newest first)
    })

    return finalResult
  }

  const getFilteredJobs = () => {
    let baseJobs
    switch (selectedFilter) {
      case 'recent':
        baseJobs = getRecentJobs()
        break
      case 'pending':
        baseJobs = getJobsByStatus('pending')
        break
      case 'processing':
        baseJobs = getJobsByStatus('processing')
        break
      case 'completed':
        baseJobs = getJobsByStatus('completed')
        break
      case 'failed':
        baseJobs = getJobsByStatus('failed')
        break
      default:
        baseJobs = jobs
    }
    
    // Sort jobs by creation date (newest first) before grouping
    const sortedJobs = baseJobs.sort((a, b) => {
      const dateA = new Date(a.created_at)
      const dateB = new Date(b.created_at)
      return dateB - dateA // Descending order (newest first)
    })
    
    return groupJobs(sortedJobs)
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
              <ArrowPathIcon className="w-4 h-4" />
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
            <ChartBarIcon className="w-6 h-6 text-green-500" />
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
            <ArrowPathIcon className="w-6 h-6 text-green-500" />
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
              <div key={job.is_grouped ? `group-${job.group_id}` : `job-${job.job_id}`} className={`dropdown-row ${job.status} ${job.is_grouped ? 'grouped-job' : ''}`}>
                
                {/* Main Row Content */}
                <div className={`dropdown-main-row ${job.is_grouped ? 'clickable' : ''}`} onClick={() => job.is_grouped && toggleGroupExpansion(job.group_id)}>
                  <div className="job-status">
                    {getStatusIcon(job.status)}
                  </div>
                  
                  <div className="job-info">
                    <div className="job-filename">
                      {job.is_grouped ? (
                        <>
                          <DocumentTextIcon className="w-4 h-4 inline-block mr-2 text-blue-600" />
                          <span className="font-semibold">📄 {job.collection_name || 'Multi-page Document'}</span>
                          <span className="text-sm text-gray-500 ml-2">({job.pages?.length || 0} pages)</span>
                        </>
                      ) : (
                        job.filename
                      )}
                    </div>
                    <div className="job-details">
                      <span className="job-id">
                        ID: {job.is_grouped ? (job.group_id || '').toString().slice(0, 8) : (job.job_id || '').toString().slice(0, 8)}...
                      </span>
                      <span className="job-created">
                        Created: {formatDate(job.created_at)}
                      </span>
                      {job.completed_at && (
                        <span className="job-duration">
                          Duration: {formatDuration(job.created_at, job.completed_at)}
                        </span>
                      )}
                    </div>
                    
                    {job.is_grouped && job.statusSummary && (
                      <div className="job-status-summary">
                        <div className="status-counts">
                          {job.statusSummary.completed > 0 && (
                            <span className="status-count completed">
                              ✓ {job.statusSummary.completed}
                            </span>
                          )}
                          {job.statusSummary.processing > 0 && (
                            <span className="status-count processing">
                              ⚡ {job.statusSummary.processing}
                            </span>
                          )}
                          {job.statusSummary.pending > 0 && (
                            <span className="status-count pending">
                              ⏳ {job.statusSummary.pending}
                            </span>
                          )}
                          {job.statusSummary.failed > 0 && (
                            <span className="status-count failed">
                              ✗ {job.statusSummary.failed}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="job-badge">
                    <span className={`status-badge ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="job-actions">
                    {job.is_grouped && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleGroupExpansion(job.group_id)
                        }}
                        className="expand-btn"
                        title={expandedGroups.has(job.group_id) ? "Collapse pages" : "Expand pages"}
                      >
                        {expandedGroups.has(job.group_id) ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowJobDetails(job.is_grouped ? job.group_id : job.job_id)
                      }}
                      className="view-btn"
                      title="View details"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              
                {/* Dropdown Content - Only shows for grouped jobs when expanded */}
                {job.is_grouped && expandedGroups.has(job.group_id) && (
                  <div className="dropdown-content">
                    <div className="pages-grid">
                      {job.pages.map((page, index) => (
                        <div key={page.job_id} className={`page-row ${page.status}`}>
                          <div className="page-left">
                            <div className="page-status-icon">
                              {getStatusIcon(page.status)}
                            </div>
                            <div className="page-info">
                              <div className="page-title">
                                Page {page.page_number || index + 1}
                              </div>
                              <div className="page-subtitle">
                                {page.filename}
                              </div>
                            </div>
                          </div>
                          <div className="page-right">
                            <div className="page-stats">
                              {page.confidence_score && (
                                <span className="confidence-badge">
                                  {Math.round(page.confidence_score)}%
                                </span>
                              )}
                              <span className={`status-badge small ${getStatusColor(page.status)}`}>
                                {page.status}
                              </span>
                            </div>
                            <button
                              onClick={() => setShowJobDetails(page.job_id)}
                              className="view-btn small"
                              title="View page details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </div>
                          {page.error && (
                            <div className="page-error-full">
                              <span className="error-label">Error:</span> {page.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
            
            <JobDetailsModalContent 
              showJobDetails={showJobDetails}
              jobs={jobs}
              getStatusColor={getStatusColor}
              formatDate={formatDate}
              fetchGroupedDocument={fetchGroupedDocument}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default OCRJobsPanel
