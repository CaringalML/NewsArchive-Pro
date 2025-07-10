import { useState, useEffect, useCallback } from 'react'
import { apiService } from '../services/api'
import toast from 'react-hot-toast'

/**
 * Hook for managing OCR jobs from DynamoDB
 */
export const useOCRJobs = (userId) => {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshInterval, setRefreshInterval] = useState(null)
  const [backgroundRefreshInterval, setBackgroundRefreshInterval] = useState(null)

  // Fetch OCR jobs for user
  const fetchJobs = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const response = await apiService.getOcrJobsByUser(userId)
      const jobsData = response.data || []
      
      // Sort jobs by creation date (newest first)
      const sortedJobs = jobsData.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )
      
      setJobs(sortedJobs)
    } catch (error) {
      console.error('Failed to fetch OCR jobs:', error)
      setError(error.message)
      
      // Don't show error toast if it's a network issue or 404
      if (!error.message.includes('404') && !error.message.includes('Network')) {
        toast.error('Failed to fetch OCR jobs')
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Get job by ID
  const getJobById = useCallback(async (jobId) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.getOcrJob(jobId)
      return response.data
    } catch (error) {
      console.error('Failed to fetch OCR job:', error)
      setError(error.message)
      toast.error('Failed to fetch job details')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Update job status locally (for real-time updates)
  const updateJobStatus = useCallback((jobId, updates) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.job_id === jobId 
          ? { ...job, ...updates, updated_at: new Date().toISOString() }
          : job
      )
    )
  }, [])

  // Add new job to the list
  const addJob = useCallback((newJob) => {
    setJobs(prevJobs => [newJob, ...prevJobs])
  }, [])

  // Remove job from the list
  const removeJob = useCallback((jobId) => {
    setJobs(prevJobs => prevJobs.filter(job => job.job_id !== jobId))
  }, [])

  // Start auto-refresh for pending/processing jobs
  const startAutoRefresh = useCallback(() => {
    if (refreshInterval) return // Already running

    const interval = setInterval(() => {
      const pendingJobs = jobs.filter(job => 
        job.status === 'pending' || job.status === 'processing'
      )
      
      if (pendingJobs.length > 0) {
        fetchJobs()
      } else {
        // Stop auto-refresh if no pending jobs
        clearInterval(interval)
        setRefreshInterval(null)
      }
    }, 5000) // Check every 5 seconds

    setRefreshInterval(interval)
  }, [jobs, fetchJobs, refreshInterval])

  // Stop auto-refresh
  const stopAutoRefresh = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }
  }, [refreshInterval])

  // Get job statistics
  const getJobStats = useCallback(() => {
    const stats = {
      total: jobs.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }

    jobs.forEach(job => {
      switch (job.status) {
        case 'pending':
          stats.pending++
          break
        case 'processing':
          stats.processing++
          break
        case 'completed':
          stats.completed++
          break
        case 'failed':
          stats.failed++
          break
        default:
          break
      }
    })

    return stats
  }, [jobs])

  // Filter jobs by status
  const getJobsByStatus = useCallback((status) => {
    return jobs.filter(job => job.status === status)
  }, [jobs])

  // Get recent jobs (last 24 hours)
  const getRecentJobs = useCallback(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return jobs.filter(job => new Date(job.created_at) > oneDayAgo)
  }, [jobs])

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Refresh data when window/tab regains focus (for cross-device sync)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window focused, refreshing OCR jobs...')
      fetchJobs()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, refreshing OCR jobs...')
        fetchJobs()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchJobs])

  // Start auto-refresh when there are pending jobs
  useEffect(() => {
    const pendingJobs = jobs.filter(job => 
      job.status === 'pending' || job.status === 'processing'
    )
    
    if (pendingJobs.length > 0 && !refreshInterval) {
      startAutoRefresh()
    } else if (pendingJobs.length === 0 && refreshInterval) {
      stopAutoRefresh()
    }
  }, [jobs, refreshInterval, startAutoRefresh, stopAutoRefresh])

  // Set up background refresh for cross-device sync (every 30 seconds)
  useEffect(() => {
    if (!userId) return

    const interval = setInterval(() => {
      console.log('Background refresh: Fetching latest OCR jobs...')
      fetchJobs()
    }, 30000) // Refresh every 30 seconds

    setBackgroundRefreshInterval(interval)

    return () => {
      clearInterval(interval)
    }
  }, [userId, fetchJobs])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
      if (backgroundRefreshInterval) {
        clearInterval(backgroundRefreshInterval)
      }
    }
  }, [refreshInterval, backgroundRefreshInterval])

  return {
    jobs,
    loading,
    error,
    fetchJobs,
    getJobById,
    updateJobStatus,
    addJob,
    removeJob,
    startAutoRefresh,
    stopAutoRefresh,
    getJobStats,
    getJobsByStatus,
    getRecentJobs,
    isAutoRefreshing: !!refreshInterval
  }
}