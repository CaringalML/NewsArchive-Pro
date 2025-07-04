import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserGroupIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import './CollectionList.css'

const CollectionList = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Mock data for collections
  const collections = [
    {
      id: 1,
      name: 'Local Tribune Archives',
      description: 'Complete collection of Local Tribune newspaper from 1890-1920',
      dateRange: '1890-1920',
      totalPages: 12453,
      status: 'active',
      lastUpdated: '2024-01-15',
      visibility: 'public',
      contributors: 3
    },
    {
      id: 2,
      name: 'Daily Herald Collection',
      description: 'Regional newspaper covering local events and politics',
      dateRange: '1901-1945',
      totalPages: 8976,
      status: 'processing',
      lastUpdated: '2024-01-10',
      visibility: 'private',
      contributors: 1
    },
    {
      id: 3,
      name: 'Morning Chronicle',
      description: 'Early morning publication with business and trade news',
      dateRange: '1885-1910',
      totalPages: 6789,
      status: 'completed',
      lastUpdated: '2024-01-08',
      visibility: 'public',
      contributors: 5
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'processing':
        return 'warning'
      case 'completed':
        return 'primary'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'processing':
        return 'Processing'
      case 'completed':
        return 'Completed'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="collections-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">Collections</h1>
            <p className="page-subtitle">
              Manage and explore your newspaper collections
            </p>
          </div>
          <div className="header-actions">
            <Link to="/processing" className="btn btn-primary">
              <PlusIcon className="w-5 h-5" />
              New Collection
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="collections-controls">
          <div className="search-section">
            <div className="search-input-wrapper">
              <MagnifyingGlassIcon className="search-icon" />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-group">
              <label className="filter-label">
                <FunnelIcon className="w-4 h-4" />
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Collections Grid */}
        <div className="collections-grid">
          {collections.map((collection) => (
            <div key={collection.id} className="collection-card">
              <div className="collection-content">
                <div className="collection-header">
                  <h3 className="collection-title">{collection.name}</h3>
                  <span className={`status-badge ${getStatusColor(collection.status)}`}>
                    {getStatusLabel(collection.status)}
                  </span>
                </div>

                <p className="collection-description">{collection.description}</p>

                <div className="collection-meta">
                  <div className="meta-item">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{collection.dateRange}</span>
                  </div>
                  <div className="meta-item">
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>{collection.totalPages.toLocaleString()} pages</span>
                  </div>
                  <div className="meta-item">
                    <UserGroupIcon className="w-4 h-4" />
                    <span>{collection.contributors} contributors</span>
                  </div>
                </div>

                <div className="collection-footer">
                  <div className="visibility-indicator">
                    <span className={`visibility-badge ${collection.visibility}`}>
                      {collection.visibility}
                    </span>
                  </div>
                  <div className="last-updated">
                    Updated {new Date(collection.lastUpdated).toLocaleDateString()}
                  </div>
                </div>

                <div className="collection-actions">
                  <Link 
                    to={`/collections/${collection.id}`} 
                    className="btn btn-sm btn-primary"
                  >
                    <EyeIcon className="w-4 h-4" />
                    View Collection
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CollectionList