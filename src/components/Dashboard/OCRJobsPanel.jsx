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
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useOCRJobs } from '../../hooks/useOCRJobs'
import { useUserManagement } from '../../hooks/useUserManagement'
import { apiService } from '../../services/api'
import MetadataDisplay from '../Common/MetadataDisplay'
import toast from 'react-hot-toast'
import './OCRJobsPanel.css'

const JobDetailsModalContent = ({ showJobDetails, jobs, getStatusColor, formatDate, fetchGroupedDocument }) => {
  const [groupedData, setGroupedData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  // Find the job (could be single job or grouped job)
  const job = jobs.find(j => 
    j.job_id === showJobDetails || 
    j.group_id === showJobDetails || 
    (j.is_grouped && j.group_id === showJobDetails)
  )
  
  React.useEffect(() => {
    const loadGroupedData = async () => {
      if (job && job.is_grouped && job.group_id) {
        setLoading(true)
        
        // First try to use local data if available
        if (job.pages && job.pages.length > 0) {
          // Sort pages by page number
          const sortedPages = [...job.pages].sort((a, b) => (a.page_number || 0) - (b.page_number || 0))
          
          // Build combined text from all pages
          const combinedText = sortedPages
            .filter(p => p.corrected_text || p.extracted_text)
            .map((p, index) => {
              const pageText = p.corrected_text || p.extracted_text || ''
              return `[Page ${p.page_number || index + 1}]\n${pageText}`
            })
            .join('\n\n--- Page Break ---\n\n')
          
          setGroupedData({
            group_id: job.group_id,
            total_pages: sortedPages.length,
            pages: sortedPages,
            combined_text: combinedText,
            collection_name: job.collection_name || job.filename,
            status_summary: {
              completed: sortedPages.filter(p => p.status === 'completed').length,
              processing: sortedPages.filter(p => p.status === 'processing').length,
              pending: sortedPages.filter(p => p.status === 'pending' || p.status === 'queued').length,
              failed: sortedPages.filter(p => p.status === 'failed').length
            }
          })
          setLoading(false)
        } else {
          // Only try API if no local data available
          try {
            const data = await fetchGroupedDocument(job.group_id)
            setGroupedData(data)
          } catch (error) {
            console.error('Failed to load grouped document:', error)
            // Fallback to basic structure
            setGroupedData({
              group_id: job.group_id,
              total_pages: 0,
              pages: [],
              combined_text: 'Unable to load document content',
              error: error.message
            })
          } finally {
            setLoading(false)
          }
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
      {isGrouped && (
        <div className="text-content-section">
          <div className="section-header">
            <DocumentTextIcon className="w-5 h-5" />
            <h3>Combined Document Content</h3>
            <span className="page-count-badge">{displayData.total_pages || 0} pages</span>
          </div>
          
          {/* Status Summary for Grouped Document */}
          {displayData.status_summary && (
            <div className="grouped-status-summary">
              {displayData.status_summary.completed > 0 && (
                <span className="status-badge completed">
                  ✓ {displayData.status_summary.completed} completed
                </span>
              )}
              {displayData.status_summary.processing > 0 && (
                <span className="status-badge processing">
                  ⚡ {displayData.status_summary.processing} processing
                </span>
              )}
              {displayData.status_summary.pending > 0 && (
                <span className="status-badge pending">
                  ⏳ {displayData.status_summary.pending} pending
                </span>
              )}
              {displayData.status_summary.failed > 0 && (
                <span className="status-badge failed">
                  ✗ {displayData.status_summary.failed} failed
                </span>
              )}
            </div>
          )}
          
          <div className="text-content">
            <div className="text-block">
              {displayData.combined_text ? (
                <div className="text-preview multi-page">
                  {displayData.combined_text}
                </div>
              ) : displayData.error ? (
                <div className="error-message-display">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                  <p>Unable to load combined text: {displayData.error}</p>
                  <p className="error-hint">Individual page content may still be available below.</p>
                </div>
              ) : (
                <div className="no-text-message">
                  <p>No text content available for this document.</p>
                </div>
              )}
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
  const [groupedDocuments, setGroupedDocuments] = useState({})
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [editingJob, setEditingJob] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [editFormData, setEditFormData] = useState({
    filename: '',
    collection_name: ''
  })

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

  // Edit functionality
  const handleEditJob = (job) => {
    setEditingJob(job.job_id)
    setEditFormData({
      filename: job.filename || '',
      collection_name: job.collection_name || ''
    })
  }

  const handleSaveEdit = async (job) => {
    try {
      // Call API to update job with job_id and created_at
      await apiService.updateOCRJob(job.job_id, job.created_at, editFormData)
      toast.success('Job updated successfully')
      setEditingJob(null)
      fetchJobs() // Refresh the jobs list
    } catch (error) {
      console.error('Failed to update job:', error)
      toast.error('Failed to update job: ' + (error.message || 'Unknown error'))
    }
  }

  const handleCancelEdit = () => {
    setEditingJob(null)
    setEditFormData({ filename: '', collection_name: '' })
  }

  // Delete functionality
  const handleDeleteJob = (job) => {
    setShowDeleteConfirm(job)
  }

  const confirmDeleteJob = async () => {
    if (!showDeleteConfirm) return

    try {
      if (showDeleteConfirm.is_grouped) {
        // Delete entire group
        await apiService.deleteOCRGroup(showDeleteConfirm.group_id)
        toast.success('Document group deleted successfully')
      } else {
        // Delete single job with job_id and created_at
        await apiService.deleteOCRJob(showDeleteConfirm.job_id, showDeleteConfirm.created_at)
        toast.success('Job deleted successfully')
      }
      
      setShowDeleteConfirm(null)
      fetchJobs() // Refresh the jobs list
    } catch (error) {
      console.error('Failed to delete job:', error)
      toast.error('Failed to delete job: ' + (error.message || 'Unknown error'))
    }
  }

  const cancelDeleteJob = () => {
    setShowDeleteConfirm(null)
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
                          <span className="font-semibold">{job.collection_name || 'Multi-page Document'}</span>
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
                    {!job.is_grouped && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditJob(job)
                        }}
                        className="edit-btn"
                        title="Edit job"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteJob(job)
                      }}
                      className="delete-btn"
                      title={job.is_grouped ? "Delete group" : "Delete job"}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Edit Form - Only shows when editing this specific job */}
                {!job.is_grouped && editingJob === job.job_id && (
                  <div className="edit-form">
                    <div className="edit-form-header">
                      <h4>Edit Job</h4>
                      <button
                        onClick={handleCancelEdit}
                        className="cancel-edit-btn"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="edit-form-fields">
                      <div className="form-group">
                        <label htmlFor="edit-filename">Filename:</label>
                        <input
                          id="edit-filename"
                          type="text"
                          value={editFormData.filename}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, filename: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-collection">Collection:</label>
                        <input
                          id="edit-collection"
                          type="text"
                          value={editFormData.collection_name}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, collection_name: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="edit-form-actions">
                      <button
                        onClick={() => handleSaveEdit(job)}
                        className="save-btn"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              
                {/* Expandable Pages Grid for Grouped Jobs */}
                {job.is_grouped && expandedGroups.has(job.group_id) && (
                  <div className="pages-dropdown-content">
                    <div className="pages-header">
                      <div className="pages-summary">
                        <span className="total-pages">{job.pages?.length || 0} pages</span>
                        <div className="status-breakdown">
                          {job.statusSummary?.completed > 0 && (
                            <span className="status-pill completed">
                              ✓ {job.statusSummary.completed} done
                            </span>
                          )}
                          {job.statusSummary?.processing > 0 && (
                            <span className="status-pill processing">
                              ⚡ {job.statusSummary.processing} processing
                            </span>
                          )}
                          {job.statusSummary?.pending > 0 && (
                            <span className="status-pill pending">
                              ⏳ {job.statusSummary.pending} pending
                            </span>
                          )}
                          {job.statusSummary?.failed > 0 && (
                            <span className="status-pill failed">
                              ✗ {job.statusSummary.failed} failed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pages-grid-container">
                      <div className="pages-grid-scrollable">
                        {job.pages?.map((page, index) => (
                          <div key={page.job_id} className={`page-card-compact ${page.status}`}>
                            <div className="page-card-header">
                              <div className="page-number-badge">
                                Page {page.page_number || index + 1}
                              </div>
                              <div className="page-status-indicator">
                                {getStatusIcon(page.status)}
                              </div>
                            </div>
                            
                            <div className="page-card-content">
                              <div className="page-filename-display">
                                {page.filename || `page-${index + 1}.jpg`}
                              </div>
                              
                              <div className="page-stats-row">
                                {page.confidence_score && (
                                  <div className="confidence-display">
                                    <span className="confidence-label">Confidence:</span>
                                    <span className="confidence-value">{Math.round(page.confidence_score)}%</span>
                                  </div>
                                )}
                                <div className="processing-time">
                                  {page.created_at && formatDate(page.created_at)}
                                </div>
                              </div>
                              
                              {page.error && (
                                <div className="page-error-display">
                                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                                  <span className="error-message">{page.error}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="page-card-actions">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowJobDetails(page.job_id)
                                }}
                                className="page-action-btn view"
                                title="View page details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditJob(page)
                                }}
                                className="page-action-btn edit"
                                title="Edit page"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteJob(page)
                                }}
                                className="page-action-btn delete"
                                title="Delete page"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {job.pages?.length > 20 && (
                        <div className="pages-grid-footer">
                          <span className="large-dataset-note">
                            📄 Large document with {job.pages.length} pages - scroll to view all
                          </span>
                        </div>
                      )}
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
              jobs={[...jobs, ...filteredJobs]}
              getStatusColor={getStatusColor}
              formatDate={formatDate}
              fetchGroupedDocument={fetchGroupedDocument}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDeleteJob}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button 
                onClick={cancelDeleteJob}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="warning-icon">
                  <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
                </div>
                <div className="confirmation-text">
                  <p>Are you sure you want to delete this {showDeleteConfirm.is_grouped ? 'document group' : 'job'}?</p>
                  <p className="job-name">
                    <strong>
                      {showDeleteConfirm.is_grouped 
                        ? `${showDeleteConfirm.collection_name || 'Multi-page Document'} (${showDeleteConfirm.pages?.length || 0} pages)`
                        : showDeleteConfirm.filename
                      }
                    </strong>
                  </p>
                  <p className="warning-text">
                    This action cannot be undone. All associated data will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={cancelDeleteJob} className="cancel-btn">
                Cancel
              </button>
              <button onClick={confirmDeleteJob} className="delete-confirm-btn">
                <TrashIcon className="w-4 h-4" />
                Delete {showDeleteConfirm.is_grouped ? 'Group' : 'Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OCRJobsPanel
