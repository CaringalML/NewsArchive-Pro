import { useState, useEffect, useCallback, useRef } from 'react'
import { apiService } from '../services/api'
import toast from 'react-hot-toast'

/**
 * Enhanced real-time OCR job monitoring with optimistic updates
 */
export const useRealtimeOCR = (userId) => {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const pollIntervalRef = useRef(null)
  const lastUpdateRef = useRef({})

  // Intelligent polling intervals based on job status
  const POLL_INTERVALS = {
    ACTIVE: 1500,      // 1.5 seconds when jobs are processing
    PENDING: 3000,     // 3 seconds when jobs are pending
    IDLE: 30000,       // 30 seconds when all jobs are complete
    BACKGROUND: 60000  // 1 minute for background sync
  }

  // Notify user of status changes with custom toasts
  const notifyStatusChange = useCallback((oldJob, newJob) => {
    const filename = newJob.filename || 'Image'
    
    switch (newJob.status) {
      case 'processing':
        toast.loading(`🔄 Processing ${filename}...`, { id: newJob.job_id })
        break
      case 'completed':
        toast.success(`✅ ${filename} completed!`, { 
          id: newJob.job_id,
          duration: 4000,
          icon: '🎉'
        })
        // Play a subtle sound effect if you want
        playCompletionSound()
        break
      case 'failed':
        toast.error(`❌ ${filename} failed: ${newJob.error || 'Unknown error'}`, { 
          id: newJob.job_id,
          duration: 5000 
        })
        break
      default:
        // No notification for other statuses
        break
    }
  }, [])

  // Fetch jobs with smart diffing to minimize re-renders
  const fetchJobs = useCallback(async (silent = false) => {
    if (!userId || userId.startsWith('temp-')) {
      setJobs([])
      return
    }

    if (!silent) setLoading(true)
    setError(null)

    try {
      const response = await apiService.getOcrJobsByUser(userId)
      const newJobs = response.data || []
      
      // Smart update: only update state if data actually changed
      setJobs(prevJobs => {
        const hasChanged = JSON.stringify(prevJobs) !== JSON.stringify(newJobs)
        
        if (hasChanged) {
          // Check for status changes and notify user
          prevJobs.forEach(oldJob => {
            const newJob = newJobs.find(j => j.job_id === oldJob.job_id)
            if (newJob && oldJob.status !== newJob.status) {
              notifyStatusChange(oldJob, newJob)
            }
          })
        }
        
        return hasChanged ? newJobs : prevJobs
      })

      // Update last fetch time
      lastUpdateRef.current = { time: Date.now(), count: newJobs.length }
      
    } catch (error) {
      if (!silent) {
        console.error('Failed to fetch OCR jobs:', error)
        setError(error.message)
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [userId, notifyStatusChange])

  // Optional: Play a subtle completion sound
  const playCompletionSound = () => {
    // You can add a small audio file for completion notification
    // const audio = new Audio('/sounds/completion.mp3')
    // audio.volume = 0.3
    // audio.play().catch(() => {})
  }

  // Optimistic update when creating a new job
  const addOptimisticJob = useCallback((fileInfo) => {
    const optimisticJob = {
      job_id: `optimistic-${Date.now()}-${Math.random()}`,
      created_at: new Date().toISOString(),
      user_id: userId,
      filename: fileInfo.name,
      status: 'uploading',
      progress: 0,
      optimistic: true
    }

    setJobs(prev => [optimisticJob, ...prev])
    
    // Show upload toast
    toast.loading(`📤 Uploading ${fileInfo.name}...`, { id: optimisticJob.job_id })
    
    return optimisticJob
  }, [userId])

  // Update optimistic job with real data
  const updateOptimisticJob = useCallback((optimisticId, realJob) => {
    setJobs(prev => prev.map(job => 
      job.job_id === optimisticId ? { ...realJob, optimistic: false } : job
    ))
    
    // Update toast
    toast.success(`✅ ${realJob.filename} uploaded!`, { 
      id: optimisticId,
      duration: 2000 
    })
  }, [])

  // Remove optimistic job on error
  const removeOptimisticJob = useCallback((optimisticId, error) => {
    setJobs(prev => prev.filter(job => job.job_id !== optimisticId))
    toast.error(`Failed to upload: ${error}`, { id: optimisticId })
  }, [])

  // Update job progress (for upload progress)
  const updateJobProgress = useCallback((jobId, progress) => {
    setJobs(prev => prev.map(job => 
      job.job_id === jobId ? { ...job, progress } : job
    ))
  }, [])

  // Smart polling with adaptive intervals
  const startSmartPolling = useCallback(() => {
    if (pollIntervalRef.current) return

    const poll = async () => {
      await fetchJobs(true) // Silent fetch
      
      // Determine next poll interval based on job statuses
      const activeJobs = jobs.filter(j => j.status === 'processing').length
      const pendingJobs = jobs.filter(j => j.status === 'pending' || j.status === 'queued').length
      
      let nextInterval
      if (activeJobs > 0) {
        nextInterval = POLL_INTERVALS.ACTIVE
      } else if (pendingJobs > 0) {
        nextInterval = POLL_INTERVALS.PENDING
      } else {
        nextInterval = POLL_INTERVALS.IDLE
      }
      
      // Schedule next poll
      pollIntervalRef.current = setTimeout(poll, nextInterval)
    }

    poll() // Start immediately
  }, [fetchJobs, jobs, POLL_INTERVALS.ACTIVE, POLL_INTERVALS.PENDING, POLL_INTERVALS.IDLE])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // Force refresh with loading indicator
  const refresh = useCallback(async () => {
    toast.loading('Refreshing...', { id: 'refresh', duration: 1000 })
    await fetchJobs()
    toast.success('Updated!', { id: 'refresh', duration: 1000 })
  }, [fetchJobs])

  // Get job statistics with animations
  const getAnimatedStats = useCallback(() => {
    const stats = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending' || j.status === 'queued').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      successRate: jobs.length > 0 
        ? Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100)
        : 0
    }
    
    return stats
  }, [jobs])

  // Initialize and manage polling
  useEffect(() => {
    if (userId) {
      fetchJobs()
      startSmartPolling()
    }

    return () => {
      stopPolling()
    }
  }, [userId, fetchJobs, startSmartPolling, stopPolling])

  // Listen for visibility changes for instant updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userId) {
        fetchJobs(true) // Silent refresh when tab becomes visible
      }
    }

    const handleOnline = () => {
      toast.success('Back online! Syncing...', { duration: 2000 })
      fetchJobs()
    }

    const handleOffline = () => {
      toast.error('Connection lost. Working offline...', { duration: 3000 })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [userId, fetchJobs])

  return {
    jobs,
    loading,
    error,
    refresh,
    addOptimisticJob,
    updateOptimisticJob,
    removeOptimisticJob,
    updateJobProgress,
    stats: getAnimatedStats(),
    lastUpdate: lastUpdateRef.current.time,
    isPolling: !!pollIntervalRef.current
  }
}