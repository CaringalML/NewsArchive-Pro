import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserManagement } from '../../hooks/useUserManagement'
import EnhancedUploadForm from '../NewspaperProcessing/EnhancedUploadForm'
import OCRJobsPanel from './OCRJobsPanel'
import './NewDashboard.css'

const NewDashboard = () => {
  const { user: authUser, signOut } = useAuth()
  const { currentUser } = useUserManagement()
  const [activeTab, setActiveTab] = useState('upload')

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!authUser) {
    return (
      <div className="new-dashboard">
        <div className="dashboard-header">
          <h1>NewsArchive Pro</h1>
          <p>Please sign in to access the dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="new-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>NewsArchive Pro</h1>
          <div className="user-info">
            <span>Welcome, {currentUser?.name || authUser.email}</span>
            <button onClick={handleSignOut} className="sign-out-btn">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-nav">
        <button
          className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Images
        </button>
        <button
          className={`nav-tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          OCR Jobs
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'upload' && (
          <div className="tab-content">
            <EnhancedUploadForm />
          </div>
        )}
        
        {activeTab === 'jobs' && (
          <div className="tab-content">
            <OCRJobsPanel />
          </div>
        )}
      </div>
    </div>
  )
}

export default NewDashboard