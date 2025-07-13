import React, { useState, useRef, useCallback } from 'react'
import { 
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { apiService } from '../../services/api'
import { useUserManagement } from '../../hooks/useUserManagement'
import './EnhancedUploadForm.css'

const EnhancedUploadForm = () => {
  const [activeTab, setActiveTab] = useState('upload')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [collectionName, setCollectionName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [documentGroups, setDocumentGroups] = useState({})
  const [isGroupingMode, setIsGroupingMode] = useState(false)
  const [showProcessingInfo, setShowProcessingInfo] = useState(false)
  const [processingRecommendations, setProcessingRecommendations] = useState({})
  
  // User management
  const { currentUser } = useUserManagement()
  const [processingOptions, setProcessingOptions] = useState({
    enableOCR: true,
    generateMETSALTO: true,
    createSearchablePDFs: false,
    maxConcurrent: 5
  })

  const fileInputRef = useRef(null)
  const abortControllerRef = useRef(null)

  // No need for location initialization anymore

  const MAX_FILE_SIZE = parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 52428800 // 50MB
  const MAX_BATCH_SIZE = parseInt(process.env.REACT_APP_MAX_BATCH_SIZE) || 100
  const ALLOWED_TYPES = process.env.REACT_APP_ALLOWED_IMAGE_TYPES?.split(',') || [
    'image/jpeg', 'image/png', 'image/tiff', 'image/webp', 'image/bmp', 'image/gif'
  ]

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer?.files) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      processFiles(droppedFiles)
    }
  }

  const validateFile = (file) => {
    const errors = []
    
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File too large (max ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB)`)
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push(`Unsupported file type (${file.type})`)
    }
    
    return errors
  }

  const generateThumbnail = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Calculate thumbnail size (max 150x150)
          const maxSize = 150
          let { width, height } = img
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }
          }
          
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const processFiles = async (files) => {
    const newFiles = []
    const errors = []
    
    // Check batch size limit
    if (selectedFiles.length + files.length > MAX_BATCH_SIZE) {
      toast.error(`Batch size limit exceeded. Maximum ${MAX_BATCH_SIZE} files allowed.`)
      return
    }
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileErrors = validateFile(file)
      
      if (fileErrors.length > 0) {
        errors.push(`${file.name}: ${fileErrors.join(', ')}`)
        continue
      }
      
      try {
        const thumbnail = await generateThumbnail(file)
        
        newFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          id: Date.now() + Math.random() + i,
          status: 'pending',
          thumbnail,
          progress: 0,
          error: null,
          pageNumber: null,
          groupId: null,
          selected: false
        })
      } catch (error) {
        errors.push(`${file.name}: Failed to generate thumbnail`)
      }
    }
    
    if (errors.length > 0) {
      toast.error(`File validation errors:\n${errors.join('\n')}`)
    }
    
    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles])
      toast.success(`${newFiles.length} files added successfully`)
    }
  }

  const handleFileSelection = (event) => {
    const files = Array.from(event.target.files)
    processFiles(files)
  }

  const removeFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId))
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[fileId]
      return newProgress
    })
  }

  const clearAllFiles = () => {
    setSelectedFiles([])
    setUploadProgress({})
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const updateFileStatus = (fileId, status, progress = null, error = null) => {
    setSelectedFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status, progress: progress !== null ? progress : f.progress, error }
        : f
    ))
  }

  const getProcessingRecommendation = async (file) => {
    try {
      const groupId = file.groupId
      const groupFiles = groupId ? selectedFiles.filter(f => f.groupId === groupId) : [file]
      
      const settings = {
        isMultiPage: groupId ? true : false,
        pageCount: groupFiles.length
      }

      const recommendation = await apiService.getProcessingRecommendation(file, settings)
      
      setProcessingRecommendations(prev => ({
        ...prev,
        [file.id]: recommendation.data
      }))

      return recommendation.data
    } catch (error) {
      console.error('Error getting processing recommendation:', error)
      return null
    }
  }

  const analyzeAllFiles = async () => {
    setShowProcessingInfo(true)
    const promises = selectedFiles.map(file => getProcessingRecommendation(file))
    await Promise.all(promises)
  }

  const handleUploadProgress = (completed, total, result) => {
    const percentage = Math.round((completed / total) * 100)
    setUploadProgress(prev => ({
      ...prev,
      overall: percentage,
      completed,
      total
    }))
    
    if (result) {
      updateFileStatus(
        result.fileId,
        result.success ? 'completed' : 'failed',
        100,
        result.success ? null : result.error
      )
    }
  }

  const handleUpload = async () => {
    if (!collectionName.trim()) {
      toast.error('Please enter a collection name')
      return
    }

    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload')
      return
    }

    setUploading(true)
    setIsPaused(false)
    abortControllerRef.current = new AbortController()

    // Reset progress
    setUploadProgress({ overall: 0, completed: 0, total: selectedFiles.length })
    selectedFiles.forEach(file => {
      updateFileStatus(file.id, 'uploading', 0)
    })

    try {
      if (!currentUser) {
        console.log('No user available for upload')
        return
      }

      // Prepare files with group information
      const filesWithGroupInfo = selectedFiles.map(file => ({
        ...file,
        documentGroups: documentGroups
      }))

      const results = await apiService.uploadBatch(
        filesWithGroupInfo,
        currentUser.user_id,
        {
          ...processingOptions,
          collectionName,
          startDate,
          endDate,
          description,
          documentGroups: documentGroups
        },
        handleUploadProgress
      )

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      if (successful > 0) {
        toast.success(`Successfully uploaded ${successful} files`)
      }
      if (failed > 0) {
        toast.error(`Failed to upload ${failed} files`)
      }

      // Auto-clear successful files after 3 seconds
      setTimeout(() => {
        setSelectedFiles(prev => prev.filter(f => f.status !== 'completed'))
      }, 3000)

    } catch (error) {
      console.error('Batch upload error:', error)
      toast.error('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
      setIsPaused(false)
      abortControllerRef.current = null
    }
  }

  const pauseUpload = () => {
    setIsPaused(true)
    // Implementation depends on how we handle pause/resume in the API
  }

  const resumeUpload = () => {
    setIsPaused(false)
    // Implementation depends on how we handle pause/resume in the API
  }

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setUploading(false)
    setIsPaused(false)
    
    // Reset all uploading files to pending
    selectedFiles.forEach(file => {
      if (file.status === 'uploading') {
        updateFileStatus(file.id, 'pending', 0)
      }
    })
    
    setUploadProgress({})
    toast.success('Upload cancelled')
  }

  // Multi-page document management functions
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, selected: !f.selected } : f
    ))
  }

  const createDocumentGroup = () => {
    const selectedFileIds = selectedFiles.filter(f => f.selected).map(f => f.id)
    if (selectedFileIds.length < 2) {
      toast.error('Please select at least 2 files to group as a multi-page document')
      return
    }

    const groupId = Date.now() + Math.random()
    const newGroup = {
      id: groupId,
      name: `Document ${Object.keys(documentGroups).length + 1}`,
      fileIds: selectedFileIds,
      createdAt: new Date()
    }

    setDocumentGroups(prev => ({
      ...prev,
      [groupId]: newGroup
    }))

    // Update files with group info and page numbers
    setSelectedFiles(prev => {
      let pageNum = 1
      return prev.map(f => {
        if (selectedFileIds.includes(f.id)) {
          const updatedFile = {
            ...f,
            groupId,
            pageNumber: pageNum,
            selected: false
          }
          pageNum++
          return updatedFile
        }
        return f
      })
    })

    toast.success(`Created multi-page document with ${selectedFileIds.length} pages`)
    setIsGroupingMode(false)
  }

  const removeFromGroup = (fileId) => {
    setSelectedFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        const groupId = f.groupId
        if (groupId) {
          // Update document group
          setDocumentGroups(prevGroups => {
            const updatedGroups = { ...prevGroups }
            if (updatedGroups[groupId]) {
              updatedGroups[groupId].fileIds = updatedGroups[groupId].fileIds.filter(id => id !== fileId)
              // Remove group if it has less than 2 files
              if (updatedGroups[groupId].fileIds.length < 2) {
                // Reset remaining file's group info
                setSelectedFiles(prev => prev.map(file => 
                  updatedGroups[groupId].fileIds.includes(file.id) 
                    ? { ...file, groupId: null, pageNumber: null }
                    : file
                ))
                delete updatedGroups[groupId]
              }
            }
            return updatedGroups
          })
        }
        return { ...f, groupId: null, pageNumber: null }
      }
      return f
    }))
  }

  // const reorderPages = (groupId, fromIndex, toIndex) => {
  //   const groupFiles = selectedFiles
  //     .filter(f => f.groupId === groupId)
  //     .sort((a, b) => a.pageNumber - b.pageNumber)

  //   const reorderedFiles = [...groupFiles]
  //   const [movedFile] = reorderedFiles.splice(fromIndex, 1)
  //   reorderedFiles.splice(toIndex, 0, movedFile)

  //   // Update page numbers
  //   setSelectedFiles(prev => prev.map(f => {
  //     if (f.groupId === groupId) {
  //       const index = reorderedFiles.findIndex(rf => rf.id === f.id)
  //       if (index !== -1) {
  //         return { ...f, pageNumber: index + 1 }
  //       }
  //     }
  //     return f
  //   }))
  // }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      case 'uploading':
        return <ArrowPathIcon className="w-5 h-5 text-green-600 animate-spin" />
      default:
        return <DocumentArrowUpIcon className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="enhanced-upload-form">
      <div className="upload-tabs">
        <button
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Files
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Processing Options
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="upload-section">
          {/* Collection Metadata */}
          <div className="collection-metadata">
            <h3>Collection Information</h3>
            <div className="metadata-grid">
              <div className="form-group">
                <label htmlFor="collectionName">Collection Name *</label>
                <input
                  id="collectionName"
                  type="text"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="Enter collection name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="startDate">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">End Date</label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter collection description"
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Drag and Drop Upload Area */}
          <div
            className={`upload-dropzone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="dropzone-content">
              <CloudArrowUpIcon className="w-12 h-12 text-gray-400" />
              <h3>Drag and drop files here</h3>
              <p>or click to select files</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelection}
                className="hidden"
              />
              <button
                type="button"
                className="select-files-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Files
              </button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="upload-progress-section">
              <div className="progress-header">
                <h3>Upload Progress</h3>
                <div className="progress-controls">
                  {!isPaused ? (
                    <button onClick={pauseUpload} className="control-btn">
                      <PauseIcon className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={resumeUpload} className="control-btn">
                      <PlayIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={cancelUpload} className="control-btn danger">
                    <StopIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="overall-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress.overall || 0}%` }}
                  />
                </div>
                <span className="progress-text">
                  {uploadProgress.completed || 0} / {uploadProgress.total || 0} files
                </span>
              </div>
            </div>
          )}

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="selected-files-section">
              <div className="files-header">
                <h3>Selected Files ({selectedFiles.length})</h3>
                <div className="header-actions">
                  {!isGroupingMode ? (
                    <button
                      onClick={() => setIsGroupingMode(true)}
                      className="group-mode-btn"
                      disabled={uploading}
                    >
                      <DocumentArrowUpIcon className="w-4 h-4" />
                      Group as Multi-Page
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={createDocumentGroup}
                        className="create-group-btn"
                        disabled={selectedFiles.filter(f => f.selected).length < 2}
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Create Group
                      </button>
                      <button
                        onClick={() => {
                          setIsGroupingMode(false)
                          setSelectedFiles(prev => prev.map(f => ({ ...f, selected: false })))
                        }}
                        className="cancel-group-btn"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    onClick={clearAllFiles}
                    className="clear-all-btn"
                    disabled={uploading}
                  >
                    <TrashIcon className="w-4 h-4" />
                    Clear All
                  </button>
                </div>
              </div>
              <div className="files-list">
                {selectedFiles.map((fileInfo) => (
                  <div
                    key={fileInfo.id}
                    className={`file-item ${fileInfo.status} ${fileInfo.selected ? 'selected' : ''} ${fileInfo.groupId ? 'grouped' : ''}`}
                  >
                    {isGroupingMode && (
                      <div className="file-checkbox">
                        <input
                          type="checkbox"
                          checked={fileInfo.selected}
                          onChange={() => toggleFileSelection(fileInfo.id)}
                          disabled={uploading || fileInfo.groupId}
                        />
                      </div>
                    )}
                    <div className="file-thumbnail">
                      <img
                        src={fileInfo.thumbnail}
                        alt={fileInfo.name}
                        className="thumbnail-img"
                      />
                      {fileInfo.pageNumber && (
                        <span className="page-badge">Page {fileInfo.pageNumber}</span>
                      )}
                    </div>
                    <div className="file-info">
                      <div className="file-name">{fileInfo.name}</div>
                      <div className="file-details">
                        {formatFileSize(fileInfo.size)} • {fileInfo.type}
                      </div>
                      {fileInfo.groupId && documentGroups[fileInfo.groupId] && (
                        <div className="group-info">
                          <span className="group-label">
                            {documentGroups[fileInfo.groupId].name} - Page {fileInfo.pageNumber}
                          </span>
                        </div>
                      )}
                      {showProcessingInfo && processingRecommendations[fileInfo.id] && (
                        <div className="processing-info">
                          <div className="processing-route">
                            <span className={`route-badge ${processingRecommendations[fileInfo.id].recommendation}`}>
                              {processingRecommendations[fileInfo.id].processor}
                            </span>
                            <span className="estimated-time">
                              ~{processingRecommendations[fileInfo.id].estimated_time}
                            </span>
                          </div>
                          {processingRecommendations[fileInfo.id].factors.length > 0 && (
                            <div className="processing-factors">
                              {processingRecommendations[fileInfo.id].factors.slice(0, 2).map((factor, index) => (
                                <span key={index} className="factor-tag">
                                  {factor}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {fileInfo.error && (
                        <div className="file-error">{fileInfo.error}</div>
                      )}
                    </div>
                    <div className="file-status">
                      {getStatusIcon(fileInfo.status)}
                    </div>
                    <div className="file-actions">
                      {fileInfo.groupId && (
                        <button
                          onClick={() => removeFromGroup(fileInfo.id)}
                          className="ungroup-btn"
                          disabled={uploading}
                          title="Remove from group"
                        >
                          <DocumentArrowUpIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeFile(fileInfo.id)}
                        className="remove-btn"
                        disabled={uploading}
                        title="Remove file"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing Analysis */}
          {selectedFiles.length > 0 && (
            <div className="processing-analysis">
              <button
                onClick={analyzeAllFiles}
                disabled={uploading}
                className="analyze-btn"
              >
                <DocumentArrowUpIcon className="w-4 h-4" />
                {showProcessingInfo ? 'Refresh Analysis' : 'Analyze Processing Routes'}
              </button>
              {showProcessingInfo && (
                <button
                  onClick={() => setShowProcessingInfo(false)}
                  className="hide-analysis-btn"
                >
                  Hide Analysis
                </button>
              )}
            </div>
          )}

          {/* Upload Button */}
          <div className="upload-actions">
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0 || !collectionName.trim()}
              className="upload-btn"
            >
              {uploading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-5 h-5" />
                  Upload {selectedFiles.length} files
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="settings-section">
          <h3>Processing Options</h3>
          <div className="settings-grid">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={processingOptions.enableOCR}
                  onChange={(e) => setProcessingOptions(prev => ({
                    ...prev,
                    enableOCR: e.target.checked
                  }))}
                />
                Enable OCR Processing
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={processingOptions.generateMETSALTO}
                  onChange={(e) => setProcessingOptions(prev => ({
                    ...prev,
                    generateMETSALTO: e.target.checked
                  }))}
                />
                Generate METS/ALTO
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={processingOptions.createSearchablePDFs}
                  onChange={(e) => setProcessingOptions(prev => ({
                    ...prev,
                    createSearchablePDFs: e.target.checked
                  }))}
                />
                Create Searchable PDFs
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="maxConcurrent">Max Concurrent Uploads</label>
              <input
                id="maxConcurrent"
                type="number"
                min="1"
                max="10"
                value={processingOptions.maxConcurrent}
                onChange={(e) => setProcessingOptions(prev => ({
                  ...prev,
                  maxConcurrent: parseInt(e.target.value) || 5
                }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedUploadForm