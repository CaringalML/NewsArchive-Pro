import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  ChartBarIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()

  const stats = [
    {
      title: 'Total Collections',
      value: '12',
      change: '+2 this month',
      changeType: 'positive',
      icon: DocumentTextIcon
    },
    {
      title: 'Pages Processed',
      value: '45,231',
      change: '+1,234 this week',
      changeType: 'positive',
      icon: CloudArrowUpIcon
    },
    {
      title: 'Active Processing',
      value: '3',
      change: '2 pending',
      changeType: 'neutral',
      icon: ClockIcon
    },
    {
      title: 'Search Queries',
      value: '8,642',
      change: '+15% this month',
      changeType: 'positive',
      icon: MagnifyingGlassIcon
    }
  ]

  const recentActivity = [
    {
      id: 1,
      action: 'Collection "Local Tribune 1890-1920" processing completed',
      timestamp: '2 hours ago',
      status: 'success',
      icon: CheckCircleIcon
    },
    {
      id: 2,
      action: 'New batch upload started for "Daily Herald Archives"',
      timestamp: '4 hours ago',
      status: 'processing',
      icon: ClockIcon
    },
    {
      id: 3,
      action: 'OCR quality review required for "Morning Chronicle"',
      timestamp: '6 hours ago',
      status: 'warning',
      icon: ExclamationTriangleIcon
    }
  ]

  const quickActions = [
    {
      title: 'Upload New Collection',
      description: 'Start digitizing a new newspaper collection',
      icon: PlusIcon,
      link: '/processing',
      color: 'primary'
    },
    {
      title: 'View Collections',
      description: 'Browse and manage your existing collections',
      icon: DocumentTextIcon,
      link: '/collections',
      color: 'secondary'
    },
    {
      title: 'Search Archives',
      description: 'Search through your digitized content',
      icon: MagnifyingGlassIcon,
      link: '/search',
      color: 'tertiary'
    },
    {
      title: 'View Analytics',
      description: 'See detailed usage and performance metrics',
      icon: ChartBarIcon,
      link: '/analytics',
      color: 'quaternary'
    }
  ]

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="dashboard-title">
              Welcome back, {user?.user_metadata?.first_name || 'User'}!
            </h1>
            <p className="dashboard-subtitle">
              Here's what's happening with your newspaper collections
            </p>
          </div>
          <div className="header-actions">
            <Link to="/processing" className="btn btn-primary">
              <PlusIcon className="w-5 h-5" />
              New Collection
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-header">
                <div className="stat-icon">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="stat-info">
                  <div className="stat-title">{stat.title}</div>
                  <div className="stat-value">{stat.value}</div>
                </div>
              </div>
              <div className={`stat-change ${stat.changeType}`}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="dashboard-content">
          {/* Quick Actions */}
          <div className="quick-actions-section">
            <div className="section-header">
              <h2 className="section-title">Quick Actions</h2>
              <p className="section-subtitle">
                Common tasks to get you started
              </p>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className={`action-card ${action.color}`}
                >
                  <div className="action-icon">
                    <action.icon className="w-8 h-8" />
                  </div>
                  <div className="action-content">
                    <h3 className="action-title">{action.title}</h3>
                    <p className="action-description">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity-section">
            <div className="section-header">
              <h2 className="section-title">Recent Activity</h2>
              <Link to="/activity" className="section-link">
                View all activity
              </Link>
            </div>
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className={`activity-icon ${activity.status}`}>
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="activity-content">
                    <p className="activity-action">{activity.action}</p>
                    <p className="activity-timestamp">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard