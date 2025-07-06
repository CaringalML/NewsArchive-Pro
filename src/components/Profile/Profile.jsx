import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  UserIcon,
  KeyIcon,
  BellIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import './Profile.css'

const Profile = () => {
  const { user, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)

  const [profileData, setProfileData] = useState({
    firstName: user?.user_metadata?.first_name || '',
    lastName: user?.user_metadata?.last_name || '',
    email: user?.email || '',
    organization: user?.user_metadata?.organization || '',
    role: user?.user_metadata?.role || '',
    bio: user?.user_metadata?.bio || ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updates = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        full_name: `${profileData.firstName} ${profileData.lastName}`,
        organization: profileData.organization,
        role: profileData.role,
        bio: profileData.bio
      }

      await updateProfile(updates)
    } catch (error) {
      console.error('Profile update failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Profile Settings</h1>
            <p className="page-subtitle">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <div className="profile-container">
          {/* Profile Sidebar */}
          <div className="profile-sidebar">
            <div className="profile-avatar">
              <div className="avatar-wrapper">
                <UserIcon className="avatar-icon" />
                <button className="avatar-upload-btn">
                  <CameraIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="avatar-info">
                <h3 className="avatar-name">
                  {profileData.firstName} {profileData.lastName}
                </h3>
                <p className="avatar-email">{profileData.email}</p>
              </div>
            </div>

            <nav className="profile-nav">
              <button
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <UserIcon className="w-5 h-5" />
                Profile Information
              </button>
              <button
                className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <KeyIcon className="w-5 h-5" />
                Security
              </button>
              <button
                className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                <BellIcon className="w-5 h-5" />
                Notifications
              </button>
            </nav>
          </div>

          {/* Profile Content */}
          <div className="profile-content">
            {activeTab === 'profile' && (
              <div className="profile-section">
                <div className="section-header">
                  <h2 className="section-title">Profile Information</h2>
                  <p className="section-description">
                    Update your personal information and professional details
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit} className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleInputChange}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleInputChange}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      className="form-input"
                      disabled
                    />
                    <p className="form-help">
                      Email cannot be changed. Contact support if you need to update it.
                    </p>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Organization</label>
                      <input
                        type="text"
                        name="organization"
                        value={profileData.organization}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Your organization or institution"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <input
                        type="text"
                        name="role"
                        value={profileData.role}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Your role or title"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="security-section">
                <div className="section-header">
                  <h2 className="section-title">Security Settings</h2>
                  <p className="section-description">
                    Manage your password and account security
                  </p>
                </div>
                <p>Security settings coming soon...</p>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="notifications-section">
                <div className="section-header">
                  <h2 className="section-title">Notification Preferences</h2>
                  <p className="section-description">
                    Choose how you want to be notified about updates
                  </p>
                </div>
                <p>Notification settings coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile