import React, { useState } from 'react'
import { 
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import './UploadForm.css'

const UploadForm = () => {
  const [activeTab, setActiveTab] = useState('upload')

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
                      Supported formats: TIFF, JPEG, PNG, PDF (up to 500MB per file)
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".tiff,.tif,.jpeg,.jpg,.png,.pdf"
                      className="upload-input"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="btn btn-primary">
                      Choose Files
                    </label>
                  </div>
                </div>

                <div className="upload-options">
                  <div className="option-group">
                    <label className="option-label">Collection Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter collection name"
                    />
                  </div>

                  <div className="option-group">
                    <label className="option-label">Date Range</label>
                    <div className="date-range-inputs">
                      <input
                        type="date"
                        className="form-input"
                        placeholder="Start date"
                      />
                      <span className="date-separator">to</span>
                      <input
                        type="date"
                        className="form-input"
                        placeholder="End date"
                      />
                    </div>
                  </div>

                  <div className="option-group">
                    <label className="option-label">Description</label>
                    <textarea
                      className="form-input form-textarea"
                      placeholder="Describe this collection..."
                      rows="3"
                    />
                  </div>

                  <div className="option-group">
                    <label className="option-label">Processing Options</label>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input type="checkbox" defaultChecked />
                        <span className="checkbox-text">Enable OCR (Optical Character Recognition)</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" defaultChecked />
                        <span className="checkbox-text">Generate METS/ALTO metadata</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" />
                        <span className="checkbox-text">Create searchable PDFs</span>
                      </label>
                    </div>
                  </div>

                  <div className="upload-actions">
                    <button className="btn btn-secondary">Save as Draft</button>
                    <button className="btn btn-primary">Start Processing</button>
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