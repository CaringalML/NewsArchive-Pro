import React, { useState, useMemo } from 'react';
import { 
  FileUp, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Newspaper, 
  LogOut,
  BarChart3,
  Sparkles,
  Building,
  Users,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserManagement } from '../../hooks/useUserManagement';
import { useOCRJobs } from '../../hooks/useOCRJobs';
import EnhancedUploadForm from '../NewspaperProcessing/EnhancedUploadForm';
import OCRJobsPanel from './OCRJobsPanel';
import EntityVisualization from '../Common/EntityVisualization';
import './DashboardTemplate.css';

// Helper Components
const StatusBadge = ({ status }) => {
    const getStatusClass = (status) => {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'processing': return 'status-processing';
            case 'pending': return 'status-pending';
            case 'failed': return 'status-failed';
            default: return 'status-default';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={14} />;
            case 'processing': return <Clock size={14} />;
            case 'pending': return <Clock size={14} />;
            case 'failed': return <XCircle size={14} />;
            default: return null;
        }
    };

    return (
        <span className={`status-badge ${getStatusClass(status)}`}>
            <span className="status-badge-icon">{getStatusIcon(status)}</span>
            {status}
        </span>
    );
};

// Sidebar Component
const Sidebar = ({ activeView, setActiveView, user, onSignOut }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'upload', label: 'Upload Images', icon: FileUp },
        { id: 'jobs', label: 'OCR Jobs', icon: Newspaper },
        { id: 'search', label: 'Archive Search', icon: Search },
    ];

    return (
        <div className="dashboard-sidebar">
            <div className="sidebar-header">
                <Newspaper className="sidebar-logo" />
                <span className="sidebar-title">NewsArchive Pro</span>
            </div>
            
            <div className="sidebar-nav">
                <div className="nav-section">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={`nav-link ${activeView === item.id ? 'active' : ''}`}
                        >
                            <item.icon className="nav-icon" />
                            {item.label}
                        </button>
                    ))}
                </div>
                
                <div className="sidebar-footer">
                    <div className="user-section">
                        <div className="user-info">
                            <p className="user-label">User</p>
                            <p className="user-email">{user?.email}</p>
                        </div>
                        <button onClick={onSignOut} className="nav-link">
                            <LogOut className="nav-icon" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Dashboard Overview Component
const Dashboard = ({ jobs, stats }) => {
    const statsData = [
        { name: 'Total Jobs', value: stats.total, icon: BarChart3 },
        { name: 'Completed', value: stats.completed, icon: CheckCircle2 },
        { name: 'In Progress', value: stats.processing + stats.pending, icon: Clock },
        { name: 'Failed', value: stats.failed, icon: XCircle },
    ];

    const recentJobs = jobs.slice(0, 5);

    // Calculate metadata stats from completed jobs
    const metadataStats = useMemo(() => {
        const completedJobs = jobs.filter(job => job.status === 'completed' && job.comprehend_processed);
        
        let totalEntities = 0;
        let totalOrganizations = 0;
        let totalPeople = 0;
        let totalLocations = 0;
        let allEntities = {};

        completedJobs.forEach(job => {
            if (job.metadata_summary) {
                try {
                    const metadata = typeof job.metadata_summary === 'string' 
                        ? JSON.parse(job.metadata_summary) 
                        : job.metadata_summary;
                    
                    if (metadata.entities) {
                        Object.entries(metadata.entities).forEach(([type, entityList]) => {
                            totalEntities += entityList.length;
                            if (type === 'ORGANIZATION') totalOrganizations += entityList.length;
                            if (type === 'PERSON') totalPeople += entityList.length;
                            if (type === 'LOCATION') totalLocations += entityList.length;
                            
                            // Aggregate entities for visualization
                            if (!allEntities[type]) allEntities[type] = [];
                            entityList.forEach(entity => {
                                if (!allEntities[type].includes(entity)) {
                                    allEntities[type].push(entity);
                                }
                            });
                        });
                    }
                } catch (e) {
                    console.error('Error parsing metadata:', e);
                }
            }
        });

        return {
            totalJobs: completedJobs.length,
            totalEntities,
            totalOrganizations,
            totalPeople,
            totalLocations,
            allEntities
        };
    }, [jobs]);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview of your OCR processing activities</p>
            </div>
            
            {/* Stats Grid */}
            <div className="stats-grid">
                {statsData.map((item) => (
                    <div key={item.name} className="stat-card">
                        <div className="stat-card-content">
                            <div className="stat-icon-wrapper">
                                <item.icon className="stat-icon" />
                            </div>
                            <div className="stat-details">
                                <p className="stat-label">{item.name}</p>
                                <p className="stat-value">{item.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Metadata Stats */}
            {metadataStats.totalJobs > 0 && (
                <div className="dashboard-card metadata-overview">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Sparkles className="inline w-5 h-5 mr-2 text-purple-600" />
                            AI Analysis Overview
                        </h3>
                        <p className="card-subtitle">
                            Extracted from {metadataStats.totalJobs} processed documents
                        </p>
                    </div>
                    
                    <div className="metadata-stats-grid">
                        <div className="metadata-stat-card">
                            <div className="metadata-stat-icon organizations">
                                <Building className="w-6 h-6" />
                            </div>
                            <div className="metadata-stat-content">
                                <div className="metadata-stat-value">{metadataStats.totalOrganizations}</div>
                                <div className="metadata-stat-label">Organizations</div>
                            </div>
                        </div>
                        
                        <div className="metadata-stat-card">
                            <div className="metadata-stat-icon people">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="metadata-stat-content">
                                <div className="metadata-stat-value">{metadataStats.totalPeople}</div>
                                <div className="metadata-stat-label">People</div>
                            </div>
                        </div>
                        
                        <div className="metadata-stat-card">
                            <div className="metadata-stat-icon locations">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div className="metadata-stat-content">
                                <div className="metadata-stat-value">{metadataStats.totalLocations}</div>
                                <div className="metadata-stat-label">Locations</div>
                            </div>
                        </div>
                        
                        <div className="metadata-stat-card">
                            <div className="metadata-stat-icon entities">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="metadata-stat-content">
                                <div className="metadata-stat-value">{metadataStats.totalEntities}</div>
                                <div className="metadata-stat-label">Total Entities</div>
                            </div>
                        </div>
                    </div>

                    {/* Entity Visualization */}
                    {Object.keys(metadataStats.allEntities).length > 0 && (
                        <div className="entities-section">
                            <h4 className="entities-title">Discovered Entities</h4>
                            <EntityVisualization entities={metadataStats.allEntities} compact={true} />
                        </div>
                    )}
                </div>
            )}

            {/* Recent Jobs */}
            <div className="dashboard-card">
                <div className="card-header">
                    <h3 className="card-title">Recent OCR Jobs</h3>
                    <p className="card-subtitle">Your latest image processing jobs</p>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead className="table-header">
                            <tr>
                                <th>File Name</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentJobs.length > 0 ? recentJobs.map((job) => (
                                <tr key={job.job_id} className="table-row">
                                    <td className="table-cell font-medium">{job.filename}</td>
                                    <td className="table-cell">
                                        <StatusBadge status={job.status} />
                                    </td>
                                    <td className="table-cell">
                                        {new Date(job.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="table-cell">
                                        {job.confidence_score ? `${Math.round(job.confidence_score)}%` : 'N/A'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="table-cell">
                                        <div className="empty-state">
                                            <Newspaper className="empty-icon" />
                                            <p className="empty-title">No jobs yet</p>
                                            <p className="empty-description">Upload some images to get started!</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Upload View Component
const UploadView = () => {
    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Upload Images</h1>
                <p className="page-subtitle">Upload newspaper images for OCR processing</p>
            </div>
            <EnhancedUploadForm />
        </div>
    );
};

// Jobs View Component
const JobsView = () => {
    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">OCR Jobs</h1>
                <p className="page-subtitle">Monitor and manage your image processing jobs</p>
            </div>
            <OCRJobsPanel />
        </div>
    );
};

// Search View Component
const ArchiveSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const performSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;
        
        setIsSearching(true);
        try {
            // Placeholder for search functionality
            setTimeout(() => {
                setResults([
                    { 
                        id: 1, 
                        title: 'Sample OCR Result', 
                        filename: 'newspaper_page_001.jpg', 
                        date: new Date().toISOString().split('T')[0], 
                        snippet: `Found text matching "${query}" in the extracted content...`,
                        confidence_score: 95
                    },
                ]);
                setIsSearching(false);
            }, 1000);
        } catch (error) {
            console.error('Search error:', error);
            setIsSearching(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Archive Search</h1>
                <p className="page-subtitle">Search through extracted text content</p>
            </div>
            
            <div className="dashboard-card">
                <div className="card-content">
                    <form onSubmit={performSearch} className="search-container">
                        <div className="search-input-wrapper">
                            <Search className="search-icon" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="form-input search-input"
                                placeholder="Search extracted text content..."
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="btn btn-primary"
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>
            </div>

            {isSearching && (
                <div className="dashboard-card">
                    <div className="card-content">
                        <div className="loading-container">
                            <Clock className="loading-icon" />
                            <p className="loading-text">Searching OCR results...</p>
                        </div>
                    </div>
                </div>
            )}

            {!isSearching && results.length > 0 && (
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3 className="card-title">Search Results for "{query}"</h3>
                        <p className="card-subtitle">{results.length} results found</p>
                    </div>
                    <div className="card-content">
                        {results.map(result => (
                            <div key={result.id} style={{ padding: '16px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5', fontWeight: '600' }}>
                                    {result.title}
                                </h4>
                                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                                    {result.snippet}
                                </p>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
                                    <span>📄 {result.filename}</span>
                                    <span>📅 {result.date}</span>
                                    <span>📊 Confidence: {result.confidence_score}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!isSearching && query && results.length === 0 && (
                <div className="dashboard-card">
                    <div className="card-content">
                        <div className="empty-state">
                            <Search className="empty-icon" />
                            <p className="empty-title">No results found</p>
                            <p className="empty-description">No results found for "{query}"</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main Dashboard Component
export default function DashboardTemplate() {
    const [activeView, setActiveView] = useState('dashboard');
    const { user, signOut } = useAuth();
    const { currentUser } = useUserManagement();
    const { jobs, getJobStats } = useOCRJobs(currentUser?.user_id);

    const stats = useMemo(() => getJobStats(), [getJobStats]);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <Dashboard jobs={jobs} stats={stats} />;
            case 'upload':
                return <UploadView />;
            case 'jobs':
                return <JobsView />;
            case 'search':
                return <ArchiveSearch />;
            default:
                return <Dashboard jobs={jobs} stats={stats} />;
        }
    };

    if (!user) {
        return (
            <div className="auth-required">
                <div className="auth-content">
                    <Newspaper className="auth-icon" />
                    <h2 className="auth-title">Please sign in</h2>
                    <p className="auth-description">You need to be authenticated to access the dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <Sidebar 
                activeView={activeView} 
                setActiveView={setActiveView} 
                user={user}
                onSignOut={handleSignOut}
            />
            <main className="dashboard-main">
                <div className="dashboard-content">
                    {renderView()}
                </div>
            </main>
        </div>
    );
}