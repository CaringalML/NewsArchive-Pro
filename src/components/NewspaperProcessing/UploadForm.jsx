import React, { useState } from 'react'
import { 
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import './UploadForm.css'
import toast from 'react-hot-toast'

const UploadForm = () => {
  const [activeTab, setActiveTab] = useState('upload')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [processingOptions, setProcessingOptions] = useState({
    enableOCR: true,
    generateMETSALTO: true,
    createSearchablePDFs: false
  })

  const MAX_FILE_SIZE = parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10485760
  const ALLOWED_TYPES = process.env.REACT_APP_ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/tiff', 'image/webp']

  const handleFileSelection = (event) => {
    const files = Array.from(event.target.files)
    const validFiles = []
    const errors = []

    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} is too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`)
      } else if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name} is not a supported file type`)
      } else {
        validFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          id: Date.now() + Math.random(),
          status: 'pending'
        })
      }
    })

    if (errors.length > 0) {
      toast.error(`File validation errors: ${errors.join(', ')}`)
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
      toast.success(`${validFiles.length} files selected`)
    }
  }

  const removeFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const uploadToS3 = async (file, fileName) => {
    // This would typically use AWS SDK or signed URLs
    // For now, return a mock promise
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate for demo
          resolve({
            Location: `https://${process.env.REACT_APP_AWS_CLOUDFRONT_DOMAIN}/newspapers/${fileName}`,
            Key: `newspapers/${fileName}`,
            Bucket: process.env.REACT_APP_AWS_S3_BUCKET
          })
        } else {
          reject(new Error('Upload failed'))
        }
      }, 1000 + Math.random() * 2000)
    })
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
    const uploadPromises = selectedFiles.map(async (fileInfo) => {
      try {
        const fileName = `${Date.now()}-${fileInfo.name}`
        const result = await uploadToS3(fileInfo.file, fileName)
        
        setSelectedFiles(prev => prev.map(f => 
          f.id === fileInfo.id 
            ? { ...f, status: 'completed', uploadResult: result }
            : f
        ))
        
        return { success: true, fileName, result }
      } catch (error) {
        setSelectedFiles(prev => prev.map(f => 
          f.id === fileInfo.id 
            ? { ...f, status: 'error', error: error.message }
            : f
        ))
        
        return { success: false, fileName: fileInfo.name, error: error.message }
      }
    })

    const results = await Promise.all(uploadPromises)
    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    if (errorCount > 0) {
      toast.error(`Upload completed with ${errorCount} errors`)
    } else {
      toast.success(`All ${successCount} files uploaded successfully!`)
    }

    setUploading(false)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="processing-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Processing Center</h1>
            <p className="page-subtitle">
              Upload, process, and monitor your newspaper digitization projects
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="processing-tabs">
          <button
            className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <CloudArrowUpIcon className="w-5 h-5" />
            Upload
          </button>
          <button
            className={`tab-button ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <ClockIcon className="w-5 h-5" />
            Processing Queue
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'upload' && (
            <div className="upload-section">
              <div className="upload-card">
                <div className="upload-header">
                  <h2 className="upload-title">Upload New Collection</h2>
                  <p className="upload-description">
                    Upload newspaper images or PDFs to start the digitization process
                  </p>
                </div>

                <div className="upload-area">
                  <div className="upload-zone">
                    <DocumentArrowUpIcon className="upload-icon" />
                    <h3 className="upload-zone-title">Drop files here or click to browse</h3>
                    <p className="upload-zone-description">
                      Supported formats: TIFF, JPEG, PNG, PDF (files >50MB will use AWS Batch processing)
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".tiff,.tif,.jpeg,.jpg,.png,.webp"
                      className="upload-input"
                      id="file-upload"
                      onChange={handleFileSelection}
                    />
                    <label htmlFor="file-upload" className="btn btn-primary">
                      Choose Files
                    </label>
                  </div>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="selected-files">
                    <h3 className="files-title">Selected Files ({selectedFiles.length})</h3>
                    <div className="files-list">
                      {selectedFiles.map((fileInfo) => (
                        <div key={fileInfo.id} className="file-item">
                          <div className="file-info">
                            <span className="file-name">{fileInfo.name}</span>
                            <span className="file-size">{formatFileSize(fileInfo.size)}</span>
                          </div>
                          <div className="file-status">
                            {fileInfo.status === 'pending' && (
                              <button
                                onClick={() => removeFile(fileInfo.id)}
                                className="btn btn-sm btn-secondary"
                                disabled={uploading}
                              >
                                Remove
                              </button>
                            )}
                            {fileInfo.status === 'completed' && (
                              <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            )}
                            {fileInfo.status === 'error' && (
                              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="upload-options">
                  <div className="option-group">
                    <label className="option-label">Collection Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter collection name"
                      value={collectionName}
                      onChange={(e) => setCollectionName(e.target.value)}
                    />
                  </div>

                  <div className="option-group">
                    <label className="option-label">Date Range</label>
                    <div className="date-range-inputs">
                      <input
                        type="date"
                        className="form-input"
                        placeholder="Start date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                      <span className="date-separator">to</span>
                      <input
                        type="date"
                        className="form-input"
                        placeholder="End date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="option-group">
                    <label className="option-label">Description</label>
                    <textarea
                      className="form-input form-textarea"
                      placeholder="Describe this collection..."
                      rows="3"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="option-group">
                    <label className="option-label">Processing Options</label>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={processingOptions.enableOCR}
                          onChange={(e) => setProcessingOptions(prev => ({ ...prev, enableOCR: e.target.checked }))}
                        />
                        <span className="checkbox-text">Enable OCR (Optical Character Recognition)</span>
                      </label>
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={processingOptions.generateMETSALTO}
                          onChange={(e) => setProcessingOptions(prev => ({ ...prev, generateMETSALTO: e.target.checked }))}
                        />
                        <span className="checkbox-text">Generate METS/ALTO metadata</span>
                      </label>
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={processingOptions.createSearchablePDFs}
                          onChange={(e) => setProcessingOptions(prev => ({ ...prev, createSearchablePDFs: e.target.checked }))}
                        />
                        <span className="checkbox-text">Create searchable PDFs</span>
                      </label>
                    </div>
                  </div>

                  <div className="upload-actions">
                    <button 
                      className="btn btn-secondary"
                      disabled={uploading}
                    >
                      Save as Draft
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={handleUpload}
                      disabled={uploading || selectedFiles.length === 0}
                    >
                      {uploading ? 'Uploading...' : 'Start Processing'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="queue-section">
              <div className="queue-header">
                <h2 className="queue-title">Processing Queue</h2>
                <p className="queue-description">
                  Monitor the status of your processing jobs
                </p>
              </div>

              <div className="empty-queue">
                <ClockIcon className="empty-icon" />
                <h3 className="empty-title">No processing jobs</h3>
                <p className="empty-description">
                  Upload some files to start processing
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UploadForm