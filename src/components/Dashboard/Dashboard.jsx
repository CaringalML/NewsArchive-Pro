import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FileUp, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Newspaper, 
  Settings, 
  Users, 
  Folder, 
  Calendar, 
  Type, 
  Hash,
  ChevronUp,
  LogOut,
  Upload,
  Plus,
  RefreshCw
} from 'lucide-react';
import './Dashboard.css';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { databaseService } from '../../services/databaseService';
import ApiTest from '../ApiTest';
import RealtimeDashboard from './RealtimeDashboard';

// Status mapping for display
const statusDisplayMap = {
    'pending': 'Pending',
    'ingesting': 'Ingesting',
    'ocr_processing': 'OCR Processing',
    'qa_review': 'QA Review',
    'complete': 'Complete',
    'error': 'Error',
    'verified': 'Verified',
    'needs_review': 'Needs Review',
    'approved': 'Approved',
    'processing': 'Processing',
    'completed': 'Completed',
    'failed': 'Failed'
};

const getDisplayStatus = (status) => statusDisplayMap[status] || status;

// Helper Components
const StatusBadge = ({ status }) => {
    const statusConfig = {
        Complete: { bg: 'status-complete', icon: <CheckCircle2 size={14} /> },
        'QA Review': { bg: 'status-qa-review', icon: <Search size={14} /> },
        'OCR Processing': { bg: 'status-processing', icon: <Clock size={14} /> },
        Ingesting: { bg: 'status-ingesting', icon: <FileUp size={14} /> },
        Verified: { bg: 'status-verified', icon: <CheckCircle2 size={14} /> },
        'Needs Review': { bg: 'status-needs-review', icon: <XCircle size={14} /> },
    };
    const config = statusConfig[status] || { bg: 'status-default' };
    return (
        <span className={`status-badge ${config.bg}`}>
            {config.icon && <span className="status-icon">{config.icon}</span>}
            {status}
        </span>
    );
};

const Card = ({ children, className = '' }) => (
    <div className={`dashboard-card ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ title, subtitle }) => (
    <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
    </div>
);

const CardContent = ({ children, className = '' }) => (
    <div className={`card-content ${className}`}>
        {children}
    </div>
);

// Sidebar Component
const DashboardSidebar = ({ activeView, setActiveView }) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const userMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showUserMenu]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Folder },
        { id: 'batchManager', label: 'Batch Manager', icon: Newspaper },
        { id: 'editor', label: 'QA Editor', icon: CheckCircle2 },
        { id: 'search', label: 'Archive Search', icon: Search },
        { id: 'apitest', label: 'API Test', icon: Settings },
    ];


    const handleLogout = async () => {
        await signOut();
        navigate('/home');
    };

    const NavLink = ({ item }) => (
        <button
            onClick={() => setActiveView(item.id)}
            className={`sidebar-nav-link ${activeView === item.id ? 'active' : ''}`}
        >
            <item.icon className="nav-icon" />
            {item.label}
        </button>
    );

    return (
        <div className="dashboard-sidebar">
            <div className="sidebar-header">
                <Newspaper className="sidebar-logo" />
                <span className="sidebar-title">NewsArchive Pro</span>
            </div>
            <div className="sidebar-nav">
                <nav className="nav-section">
                    {navItems.map(item => <NavLink key={item.id} item={item} />)}
                </nav>
                <div className="admin-section">
                    <p className="admin-label">Admin</p>
                    <nav className="nav-section">
                        <div className="user-menu-container" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="sidebar-nav-link user-menu-button"
                            >
                                {user?.user_metadata?.avatar_url ? (
                                    <img 
                                        src={user.user_metadata.avatar_url} 
                                        alt="Profile" 
                                        className="user-avatar"
                                    />
                                ) : (
                                    <Users className="nav-icon" />
                                )}
                                User Management
                                <ChevronUp className={`chevron-icon ${showUserMenu ? 'chevron-down' : ''}`} />
                            </button>
                            {showUserMenu && (
                                <div className="user-menu-dropdown">
                                    <button
                                        onClick={() => {
                                            setActiveView('settings');
                                            setShowUserMenu(false);
                                        }}
                                        className="dropdown-item"
                                    >
                                        <Settings className="dropdown-icon" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="dropdown-item"
                                    >
                                        <LogOut className="dropdown-icon" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </nav>
                </div>
            </div>
        </div>
    );
};

// Dashboard Overview Component
const DashboardOverview = ({ setActiveView }) => {
    const [stats, setStats] = useState([
        { name: 'Batches in Progress', stat: '0', icon: Clock },
        { name: 'Pages Digitized (24h)', stat: '0', icon: Newspaper },
        { name: 'QA Queue', stat: '0', icon: Search },
        { name: 'Total Archived Pages', stat: '0', icon: CheckCircle2 },
    ]);
    const [recentBatches, setRecentBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.id) return;
            
            try {
                setLoading(true);
                
                // Fetch dashboard stats
                const statsResult = await databaseService.getDashboardStats(user.id);
                if (statsResult.success) {
                    const data = statsResult.data;
                    setStats([
                        { name: 'Batches in Progress', stat: data.batches_in_progress?.toString() || '0', icon: Clock },
                        { name: 'Pages Digitized (24h)', stat: data.pages_digitized_24h?.toString() || '0', icon: Newspaper },
                        { name: 'QA Queue', stat: data.qa_queue_count?.toString() || '0', icon: Search },
                        { name: 'Total Archived Pages', stat: data.total_archived_pages?.toString() || '0', icon: CheckCircle2 },
                    ]);
                }

                // Fetch recent batches
                const batchesResult = await databaseService.getRecentBatches();
                if (batchesResult.success) {
                    setRecentBatches(batchesResult.data);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    return (
        <div className="dashboard-content">
            <h1 className="dashboard-title">Dashboard</h1>
            
            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((item) => (
                    <Card key={item.name}>
                        <CardContent className="stat-card">
                            <div className="stat-icon-wrapper">
                                <item.icon className="stat-icon" />
                            </div>
                            <div className="stat-info">
                                <dt className="stat-name">{item.name}</dt>
                                <dd className="stat-value">{item.stat}</dd>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Batches */}
            <Card>
                <CardHeader title="Recent Batches" subtitle="Overview of the latest digitization projects." />
                <div className="table-container">
                    <table className="dashboard-table">
                        <thead>
                            <tr>
                                <th>Batch Name</th>
                                <th>Status</th>
                                <th>Pages</th>
                                <th>Collection</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="loading-cell">Loading...</td>
                                </tr>
                            ) : recentBatches.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="empty-cell">No batches found. Upload some files to get started!</td>
                                </tr>
                            ) : (
                                recentBatches.map((batch) => (
                                    <tr key={batch.id}>
                                        <td className="batch-name">{batch.name}</td>
                                        <td><StatusBadge status={getDisplayStatus(batch.status)} /></td>
                                        <td>{batch.total_pages || 0}</td>
                                        <td>{batch.collection_name || 'No Collection'}</td>
                                        <td className="table-actions">
                                            <button onClick={() => setActiveView('editor')} className="view-link">
                                                {batch.status === 'qa_review' ? 'Review' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// Batch Manager Component
const BatchManager = ({ setActiveView }) => {
    const [allBatches, setAllBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchBatches = async () => {
            if (!user?.id) return;
            
            try {
                setLoading(true);
                const result = await databaseService.getAllBatches();
                if (result.success) {
                    setAllBatches(result.data);
                } else {
                    toast.error('Failed to load batches');
                }
            } catch (error) {
                console.error('Error fetching batches:', error);
                toast.error('Failed to load batches');
            } finally {
                setLoading(false);
            }
        };

        fetchBatches();
    }, [user]);

    const handleNewBatchUpload = () => {
        // Navigate to upload form or open modal
        setActiveView('upload');
    };

    return (
        <div className="dashboard-content">
            <div className="content-header">
                <h1 className="dashboard-title">Batch Manager</h1>
                <button className="primary-button" onClick={handleNewBatchUpload}>
                    <FileUp className="button-icon" />
                    New Batch Upload
                </button>
            </div>
            <Card>
                <CardHeader title="All Batches" subtitle="Manage all digitization projects from ingest to completion." />
                <div className="table-container">
                    <table className="dashboard-table">
                        <thead>
                            <tr>
                                <th>Batch Name</th>
                                <th>Status</th>
                                <th>Pages</th>
                                <th>Processed</th>
                                <th>Collection</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="loading-cell">Loading batches...</td>
                                </tr>
                            ) : allBatches.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="empty-cell">
                                        No batches found. Click "New Batch Upload" to create your first batch.
                                    </td>
                                </tr>
                            ) : (
                                allBatches.map((batch) => (
                                    <tr key={batch.id}>
                                        <td className="batch-name">{batch.name}</td>
                                        <td><StatusBadge status={getDisplayStatus(batch.status)} /></td>
                                        <td>{batch.total_pages || 0}</td>
                                        <td>{batch.processed_pages || 0}</td>
                                        <td>{batch.collection_name || 'No Collection'}</td>
                                        <td className="table-actions">
                                            <button onClick={() => setActiveView('editor')} className="view-link">
                                                {batch.status === 'qa_review' ? 'Review' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// QA Editor Component
const QAEditor = () => {
    const [currentPage, setCurrentPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ocr');
    const [editedText, setEditedText] = useState('');
    const [editedMeta, setEditedMeta] = useState({});
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [collectionName, setCollectionName] = useState('');
    const [batchPages, setBatchPages] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const { user } = useAuth();

    // Refresh function to reload pages for review
    const refreshPages = async () => {
        if (!user?.id) return;
        
        try {
            setLoading(true);
            // Get batches that need QA review
            const batchesResult = await databaseService.getAllBatches();
            if (batchesResult.success) {
                const qaReviewBatches = batchesResult.data.filter(batch => batch.status === 'qa_review');
                if (qaReviewBatches.length > 0) {
                    // Get pages from first QA review batch
                    const pagesResult = await databaseService.getBatchPages(qaReviewBatches[0].id);
                    if (pagesResult.success && pagesResult.data.length > 0) {
                        setBatchPages(pagesResult.data);
                        const firstPage = pagesResult.data[0];
                        setCurrentPage(firstPage);
                        setCurrentPageIndex(0);
                        setEditedText(firstPage.formatted_text || '');
                        setEditedMeta({
                            publication: firstPage.publication_name || '',
                            date: firstPage.publication_date || '',
                            page: firstPage.page_number?.toString() || '',
                            section: firstPage.section || ''
                        });
                        
                        // Debug: Log page data to see what we're getting
                        console.log('Loaded page for QA:', {
                            id: firstPage.id,
                            status: firstPage.status,
                            hasFormattedText: !!firstPage.formatted_text,
                            textLength: firstPage.formatted_text?.length || 0,
                            fullPage: firstPage
                        });
                        toast.success('Pages refreshed successfully');
                    } else {
                        setBatchPages([]);
                        setCurrentPage(null);
                        setCurrentPageIndex(0);
                        toast('No pages available for review');
                    }
                } else {
                    setBatchPages([]);
                    setCurrentPage(null);
                    setCurrentPageIndex(0);
                    toast('No batches ready for QA review');
                }
            }
        } catch (error) {
            console.error('Error refreshing pages:', error);
            toast.error('Failed to refresh pages');
        } finally {
            setLoading(false);
        }
    };

    // Load first available page for review
    useEffect(() => {
        const fetchPageForReview = async () => {
            if (!user?.id) return;
            
            try {
                setLoading(true);
                // Get batches that need QA review
                const batchesResult = await databaseService.getAllBatches();
                if (batchesResult.success) {
                    const qaReviewBatches = batchesResult.data.filter(batch => batch.status === 'qa_review');
                    if (qaReviewBatches.length > 0) {
                        // Get pages from first QA review batch
                        const pagesResult = await databaseService.getBatchPages(qaReviewBatches[0].id);
                        if (pagesResult.success && pagesResult.data.length > 0) {
                            setBatchPages(pagesResult.data);
                            const firstPage = pagesResult.data[0];
                            setCurrentPage(firstPage);
                            setEditedText(firstPage.formatted_text || '');
                            setEditedMeta({
                                publication: firstPage.publication_name || '',
                                date: firstPage.publication_date || '',
                                page: firstPage.page_number?.toString() || '',
                                section: firstPage.section || ''
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching page for review:', error);
                toast.error('Failed to load page for review');
            } finally {
                setLoading(false);
            }
        };

        fetchPageForReview();
    }, [user]);

    const handleNextPage = async () => {
        if (currentPageIndex < batchPages.length - 1) {
            const nextIndex = currentPageIndex + 1;
            const nextPage = batchPages[nextIndex];
            setCurrentPageIndex(nextIndex);
            setCurrentPage(nextPage);
            setEditedText(nextPage.formatted_text || '');
            setEditedMeta({
                publication: nextPage.publication_name || '',
                date: nextPage.publication_date || '',
                page: nextPage.page_number?.toString() || '',
                section: nextPage.section || ''
            });
        }
    };

    const handleApprovePage = async () => {
        if (!currentPage) return;
        
        try {
            // Update page status
            await databaseService.updatePageStatus(currentPage.id, 'approved');
            
            // Update OCR text if changed
            if (editedText !== currentPage.formatted_text) {
                await databaseService.updateOCRText(currentPage.id, editedText);
            }
            
            // Update metadata if changed
            const hasMetadataChanged = 
                editedMeta.publication !== currentPage.publication_name ||
                editedMeta.date !== currentPage.publication_date ||
                editedMeta.section !== currentPage.section;
                
            if (hasMetadataChanged) {
                await databaseService.updatePageMetadata(currentPage.id, editedMeta);
            }
            
            toast.success('Page approved successfully');
            handleNextPage();
        } catch (error) {
            console.error('Error approving page:', error);
            toast.error('Failed to approve page');
        }
    };

    const handleRejectPage = async () => {
        if (!currentPage) return;
        
        try {
            await databaseService.updatePageStatus(currentPage.id, 'needs_review');
            toast.success('Page marked for review');
            handleNextPage();
        } catch (error) {
            console.error('Error rejecting page:', error);
            toast.error('Failed to reject page');
        }
    };

    const MAX_FILE_SIZE = parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10485760;
    const ALLOWED_TYPES = process.env.REACT_APP_ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'];

    const handleMetaChange = (e) => {
        setEditedMeta({ ...editedMeta, [e.target.name]: e.target.value });
    };

    const handleFileSelection = (event) => {
        const files = Array.from(event.target.files);
        const validFiles = [];
        const errors = [];

        files.forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name} is too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
            } else if (!ALLOWED_TYPES.includes(file.type)) {
                errors.push(`${file.name} is not a supported file type`);
            } else {
                validFiles.push({
                    file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    id: Date.now() + Math.random(),
                    status: 'pending'
                });
            }
        });

        if (errors.length > 0) {
            toast.error(`File validation errors: ${errors.join(', ')}`);
        }

        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
            toast.success(`${validFiles.length} files selected`);
        }
    };

    const removeFile = (fileId) => {
        setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleUpload = async () => {
        if (!collectionName.trim()) {
            toast.error('Please enter a collection name');
            return;
        }

        if (selectedFiles.length === 0) {
            toast.error('Please select files to upload');
            return;
        }

        if (!user?.id) {
            toast.error('User not authenticated');
            return;
        }

        setUploading(true);
        
        try {
            // Create collection first
            const collectionResult = await databaseService.createCollection({
                name: collectionName,
                description: `Collection created on ${new Date().toLocaleDateString()}`,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
            });

            if (!collectionResult.success) {
                throw new Error('Failed to create collection');
            }

            // Create batch for this upload
            const batchResult = await databaseService.createBatch({
                name: `Batch ${new Date().toISOString()}`,
                collectionId: collectionResult.data.id,
                processingOptions: {
                    ocrEnabled: true,
                    comprehendEnabled: true
                }
            });

            if (!batchResult.success) {
                throw new Error('Failed to create batch');
            }

            // Upload each file
            const uploadPromises = selectedFiles.map(async (fileInfo, index) => {
                try {
                    // Update file status to uploading
                    setSelectedFiles(prev => prev.map(f => 
                        f.id === fileInfo.id 
                            ? { ...f, status: 'uploading' }
                            : f
                    ));

                    // Upload via API Gateway for OCR processing
                    const uploadResult = await databaseService.uploadImageForOCR(
                        fileInfo.file, 
                        user.id,
                        { 
                            ocrEnabled: true,
                            batchId: batchResult.data.id,
                            pageNumber: index + 1
                        }
                    );

                    if (!uploadResult.success) {
                        throw new Error(uploadResult.error);
                    }

                    // Add page to batch (if not handled by API Gateway)
                    if (uploadResult.data?.imageUrl) {
                        const pageResult = await databaseService.addPageToBatch({
                            batchId: batchResult.data.id,
                            pageNumber: index + 1,
                            originalFilename: fileInfo.name,
                            s3ImageUrl: uploadResult.data.imageUrl,
                            s3ThumbnailUrl: null,
                            fileSize: fileInfo.file.size,
                            imageWidth: null,
                            imageHeight: null
                        });

                        if (!pageResult.success) {
                            console.error('Failed to add page to batch:', pageResult.error);
                        }
                    }

                    // Update file status to completed
                    setSelectedFiles(prev => prev.map(f => 
                        f.id === fileInfo.id 
                            ? { ...f, status: 'completed' }
                            : f
                    ));

                    return { success: true, fileName: fileInfo.name };
                } catch (error) {
                    console.error(`Upload failed for ${fileInfo.name}:`, error);
                    
                    // Update file status to failed
                    setSelectedFiles(prev => prev.map(f => 
                        f.id === fileInfo.id 
                            ? { ...f, status: 'failed', error: error.message }
                            : f
                    ));

                    return { success: false, fileName: fileInfo.name, error: error.message };
                }
            });

            const results = await Promise.all(uploadPromises);
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            if (failed === 0) {
                toast.success(`All ${successful} files uploaded and processing started!`);
                // Refresh pages after successful upload
                setTimeout(() => {
                    refreshPages();
                }, 1000);
            } else {
                toast.error(`${successful} files uploaded, ${failed} failed`);
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
            setTimeout(() => {
                setShowUploadModal(false);
                setSelectedFiles([]);
                setCollectionName('');
            }, 2000);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="editor-container">
            <div className="editor-header">
                <div>
                    <h1 className="dashboard-title">QA Editor</h1>
                    {loading ? (
                        <p className="editor-subtitle">Loading...</p>
                    ) : currentPage ? (
                        <p className="editor-subtitle">
                            Reviewing: <span className="batch-info">{currentPage.batch_name} - Page {currentPage.page_number}</span>
                            <span className="page-counter"> ({currentPageIndex + 1} of {batchPages.length})</span>
                        </p>
                    ) : (
                        <p className="editor-subtitle">No pages available for review</p>
                    )}
                </div>
                <div className="editor-actions">
                    {!currentPage ? (
                        <>
                            <button 
                                className="secondary-button" 
                                onClick={refreshPages}
                                disabled={loading}
                            >
                                <RefreshCw className={`button-icon ${loading ? 'spinning' : ''}`} />
                                Refresh
                            </button>
                            <button 
                                className="primary-button" 
                                onClick={() => setShowUploadModal(true)}
                                disabled={loading}
                            >
                                <Upload className="button-icon" />
                                Upload Images
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                className="secondary-button" 
                                onClick={handleRejectPage}
                                disabled={loading || !currentPage}
                            >
                                Reject Page
                            </button>
                            <button 
                                className="primary-button" 
                                onClick={handleApprovePage}
                                disabled={loading || !currentPage}
                            >
                                Approve & Next
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="editor-layout">
                {/* Image Viewer */}
                <Card className="image-viewer">
                    <CardHeader title="Scanned Image" />
                    <CardContent className="image-content">
                        {loading ? (
                            <div className="loading-placeholder">
                                <p>Loading page...</p>
                            </div>
                        ) : currentPage ? (
                            <div 
                                className="image-container clickable-upload"
                                onClick={() => setShowUploadModal(true)}
                            >
                                <img 
                                    src={currentPage.s3_image_url || 'https://placehold.co/800x1200/e2e8f0/4a5568?text=No+Image'} 
                                    alt={`Scanned page ${currentPage.page_number}`} 
                                    className="scanned-image" 
                                />
                                <div className="upload-overlay">
                                    <Upload className="upload-overlay-icon" />
                                    <span className="upload-overlay-text">Click to upload new image</span>
                                </div>
                            </div>
                        ) : (
                            <div 
                                className="no-page-placeholder clickable-upload"
                                onClick={() => setShowUploadModal(true)}
                            >
                                <div className="upload-prompt">
                                    <Upload className="upload-prompt-icon" size={48} />
                                    <h3 className="upload-prompt-title">No pages to review</h3>
                                    <p className="upload-prompt-text">
                                        Click here to upload newspaper images and start processing
                                    </p>
                                    <button className="upload-prompt-button">
                                        <Plus className="button-icon" size={16} />
                                        Upload Images
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Editor Panel */}
                <Card className="editor-panel">
                    <div className="editor-tabs">
                        <button 
                            onClick={() => setActiveTab('ocr')} 
                            className={`tab-button ${activeTab === 'ocr' ? 'active' : ''}`}
                        >
                            OCR Text
                        </button>
                        <button 
                            onClick={() => setActiveTab('meta')} 
                            className={`tab-button ${activeTab === 'meta' ? 'active' : ''}`}
                        >
                            Metadata
                        </button>
                    </div>
                    <div className="tab-content">
                        {activeTab === 'ocr' && (
                            <CardContent>
                                <div className="ocr-header">
                                    <div>
                                        <label htmlFor="ocrText" className="form-label">Extracted Text (Editable)</label>
                                        {currentPage && (
                                            <div className="ocr-status">
                                                Status: <span className={`status-badge status-${currentPage.status}`}>
                                                    {getDisplayStatus(currentPage.status)}
                                                </span>
                                                {editedText && <span className="text-count">({editedText.length} characters)</span>}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={refreshPages}
                                        className="btn-secondary btn-small"
                                        disabled={loading}
                                    >
                                        <RefreshCw size={16} />
                                        {loading ? 'Refreshing...' : 'Refresh'}
                                    </button>
                                </div>
                                <textarea
                                    id="ocrText"
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="ocr-textarea"
                                    placeholder={editedText ? "" : "OCR text will appear here once processing is complete. Click 'Refresh' to check for updates."}
                                />
                            </CardContent>
                        )}
                        {activeTab === 'meta' && (
                            <CardContent className="metadata-content">
                                <div className="metadata-section">
                                    <h4 className="section-title">Page Metadata</h4>
                                    <div className="metadata-grid">
                                        <MetadataInput icon={Newspaper} label="Publication" name="publication" value={editedMeta.publication} onChange={handleMetaChange} />
                                        <MetadataInput icon={Calendar} label="Date" name="date" type="date" value={editedMeta.date} onChange={handleMetaChange} />
                                        <MetadataInput icon={Hash} label="Page" name="page" value={editedMeta.page} onChange={handleMetaChange} />
                                        <MetadataInput icon={Type} label="Section" name="section" value={editedMeta.section} onChange={handleMetaChange} />
                                    </div>
                                </div>
                                <div className="articles-section">
                                    <h4 className="section-title">Article Segmentation</h4>
                                    <ul className="articles-list">
                                        {currentPage?.articles ? currentPage.articles.map(article => (
                                            <li key={article.id} className="article-item">
                                                <p className="article-title">{article.title}</p>
                                                <StatusBadge status={getDisplayStatus(article.status)} />
                                            </li>
                                        )) : (
                                            <li className="article-item">
                                                <p className="article-title">No articles segmented yet</p>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </CardContent>
                        )}
                    </div>
                </Card>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Upload New Files</h2>
                            <button 
                                className="modal-close"
                                onClick={() => setShowUploadModal(false)}
                            >
                                <XCircle className="close-icon" />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="upload-zone">
                                <Upload className="upload-icon" />
                                <h3 className="upload-zone-title">Drop files here or click to browse</h3>
                                <p className="upload-zone-description">
                                    Supported formats: TIFF, JPEG, PNG, WebP (up to {MAX_FILE_SIZE / 1024 / 1024}MB per file)
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    accept=".tiff,.tif,.jpeg,.jpg,.png,.webp"
                                    className="upload-input"
                                    id="qa-file-upload"
                                    onChange={handleFileSelection}
                                />
                                <label htmlFor="qa-file-upload" className="primary-button">
                                    <Plus className="button-icon" />
                                    Choose Files
                                </label>
                            </div>

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
                                                            className="secondary-button file-remove-btn"
                                                            disabled={uploading}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                    {fileInfo.status === 'uploading' && (
                                                        <div className="uploading-status">
                                                            <Clock className="status-icon uploading" />
                                                            <span className="status-text">Uploading...</span>
                                                        </div>
                                                    )}
                                                    {fileInfo.status === 'completed' && (
                                                        <div className="completed-status">
                                                            <CheckCircle2 className="status-icon success" />
                                                            <span className="status-text">Completed</span>
                                                        </div>
                                                    )}
                                                    {fileInfo.status === 'failed' && (
                                                        <div className="failed-status">
                                                            <XCircle className="status-icon error" />
                                                            <span className="status-text" title={fileInfo.error}>Failed</span>
                                                        </div>
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
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button 
                                className="secondary-button"
                                onClick={() => setShowUploadModal(false)}
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                            <button 
                                className="primary-button"
                                onClick={handleUpload}
                                disabled={uploading || selectedFiles.length === 0}
                            >
                                {uploading ? 'Uploading...' : 'Upload Files'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MetadataInput = ({ icon: Icon, label, ...props }) => (
    <div className="metadata-input-group">
        <label htmlFor={props.name} className="form-label">{label}</label>
        <div className="input-with-icon">
            <Icon className="input-icon" />
            <input
                type={props.type || "text"}
                id={props.name}
                className="metadata-input"
                {...props}
            />
        </div>
    </div>
);

// Upload View Component
const UploadView = ({ setActiveView }) => {
    const { user } = useAuth();
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [collectionName, setCollectionName] = useState('');
    const [processingOptions, setProcessingOptions] = useState({
        enableOCR: true,
        generateMETSALTO: true,
        createSearchablePDFs: false
    });

    const MAX_FILE_SIZE = parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10485760;
    const ALLOWED_TYPES = process.env.REACT_APP_ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'];

    const handleFileSelection = (event) => {
        const files = Array.from(event.target.files);
        const validFiles = [];
        const errors = [];

        files.forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name} is too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
            } else if (!ALLOWED_TYPES.includes(file.type)) {
                errors.push(`${file.name} is not a supported file type`);
            } else {
                validFiles.push({
                    file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    id: Date.now() + Math.random(),
                    status: 'pending'
                });
            }
        });

        if (errors.length > 0) {
            toast.error(`File validation errors: ${errors.join(', ')}`);
        }

        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
            toast.success(`${validFiles.length} files selected`);
        }
    };

    const removeFile = (fileId) => {
        setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleUpload = async () => {
        if (!collectionName.trim()) {
            toast.error('Please enter a collection name');
            return;
        }

        if (selectedFiles.length === 0) {
            toast.error('Please select files to upload');
            return;
        }

        setUploading(true);
        
        try {
            // Create collection first
            const collectionResult = await databaseService.createCollection({
                name: collectionName,
                description: `Uploaded on ${new Date().toLocaleDateString()}`
            });

            if (!collectionResult.success) {
                throw new Error('Failed to create collection');
            }

            // Create batch
            const batchResult = await databaseService.createBatch({
                name: `${collectionName} - Batch ${Date.now()}`,
                collectionId: collectionResult.data.id,
                processingOptions
            });

            if (!batchResult.success) {
                throw new Error('Failed to create batch');
            }

            const batchId = batchResult.data.id;

            // Check if API Gateway is available for OCR processing
            const isApiGatewayAvailable = databaseService.isAPIGatewayAvailable();
            
            if (processingOptions.enableOCR && !isApiGatewayAvailable) {
                toast.warn('API Gateway not configured. OCR processing will be disabled.');
                setProcessingOptions(prev => ({ ...prev, enableOCR: false }));
            }

            // Upload files for processing
            for (let i = 0; i < selectedFiles.length; i++) {
                const fileInfo = selectedFiles[i];
                
                try {
                    // Update file status to uploading
                    setSelectedFiles(prev => prev.map(f => 
                        f.id === fileInfo.id 
                            ? { ...f, status: 'uploading' }
                            : f
                    ));

                    if (processingOptions.enableOCR && isApiGatewayAvailable) {
                        // Use API Gateway for OCR processing
                        const ocrResult = await databaseService.uploadImageForOCR(
                            fileInfo.file, 
                            user.id, 
                            {
                                enableOCR: processingOptions.enableOCR,
                                generateMETSALTO: processingOptions.generateMETSALTO,
                                createSearchablePDFs: processingOptions.createSearchablePDFs
                            }
                        );
                        
                        if (!ocrResult.success) {
                            throw new Error(ocrResult.error);
                        }

                        // Add page to database with OCR job ID
                        const pageResult = await databaseService.addPageToBatch({
                            batchId,
                            pageNumber: i + 1,
                            originalFilename: fileInfo.name,
                            s3ImageUrl: ocrResult.data.cloudfrontUrl,
                            fileSize: fileInfo.size,
                            ocrJobId: ocrResult.data.jobId
                        });

                        if (!pageResult.success) {
                            throw new Error('Failed to save page to database');
                        }

                        // Update file status with OCR job info
                        setSelectedFiles(prev => prev.map(f => 
                            f.id === fileInfo.id 
                                ? { 
                                    ...f, 
                                    status: 'processing', 
                                    ocrJobId: ocrResult.data.jobId,
                                    s3Url: ocrResult.data.cloudfrontUrl
                                }
                                : f
                        ));

                    } else {
                        // Fallback to API Gateway upload without OCR
                        const uploadResult = await databaseService.uploadImageForOCR(
                            fileInfo.file, 
                            user.id,
                            { ocrEnabled: false }
                        );
                        
                        if (!uploadResult.success) {
                            throw new Error(uploadResult.error);
                        }

                        // Add page to database
                        const pageResult = await databaseService.addPageToBatch({
                            batchId,
                            pageNumber: i + 1,
                            originalFilename: fileInfo.name,
                            s3ImageUrl: uploadResult.url,
                            fileSize: fileInfo.size
                        });

                        if (!pageResult.success) {
                            throw new Error('Failed to save page to database');
                        }

                        // Update file status to completed
                        setSelectedFiles(prev => prev.map(f => 
                            f.id === fileInfo.id 
                                ? { ...f, status: 'completed', s3Url: uploadResult.url }
                                : f
                        ));
                    }

                } catch (error) {
                    console.error(`Error processing file ${fileInfo.name}:`, error);
                    setSelectedFiles(prev => prev.map(f => 
                        f.id === fileInfo.id 
                            ? { ...f, status: 'error', error: error.message }
                            : f
                    ));
                }
            }

            // Update batch status to ingesting
            await databaseService.updateBatchStatus(batchId, 'ingesting');

            toast.success('Files uploaded successfully! Processing has started.');
            
            // Clear form
            setSelectedFiles([]);
            setCollectionName('');
            
            // Navigate back to batch manager
            setActiveView('batchManager');

        } catch (error) {
            console.error('Upload error:', error);
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="dashboard-content">
            <div className="content-header">
                <h1 className="dashboard-title">Upload Files</h1>
                <button 
                    className="secondary-button"
                    onClick={() => setActiveView('batchManager')}
                >
                    Back to Batches
                </button>
            </div>

            <Card>
                <CardHeader title="Upload New Collection" subtitle="Upload newspaper images to start the digitization process" />
                <CardContent>
                    <div className="upload-zone">
                        <Upload className="upload-icon" />
                        <h3 className="upload-zone-title">Drop files here or click to browse</h3>
                        <p className="upload-zone-description">
                            Supported formats: TIFF, JPEG, PNG, WebP (up to {MAX_FILE_SIZE / 1024 / 1024}MB per file)
                        </p>
                        <input
                            type="file"
                            multiple
                            accept=".tiff,.tif,.jpeg,.jpg,.png,.webp"
                            className="upload-input"
                            id="batch-file-upload"
                            onChange={handleFileSelection}
                        />
                        <label htmlFor="batch-file-upload" className="primary-button">
                            <Plus className="button-icon" />
                            Choose Files
                        </label>
                    </div>

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
                                                    className="secondary-button file-remove-btn"
                                                    disabled={uploading}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                            {fileInfo.status === 'uploading' && (
                                                <span className="status-text">Uploading...</span>
                                            )}
                                            {fileInfo.status === 'completed' && (
                                                <CheckCircle2 className="status-icon success" />
                                            )}
                                            {fileInfo.status === 'error' && (
                                                <XCircle className="status-icon error" />
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
                                disabled={uploading}
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
                                        disabled={uploading}
                                    />
                                    <span className="checkbox-text">Enable OCR (Optical Character Recognition)</span>
                                </label>
                                <label className="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        checked={processingOptions.generateMETSALTO}
                                        onChange={(e) => setProcessingOptions(prev => ({ ...prev, generateMETSALTO: e.target.checked }))}
                                        disabled={uploading}
                                    />
                                    <span className="checkbox-text">Generate METS/ALTO metadata</span>
                                </label>
                                <label className="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        checked={processingOptions.createSearchablePDFs}
                                        onChange={(e) => setProcessingOptions(prev => ({ ...prev, createSearchablePDFs: e.target.checked }))}
                                        disabled={uploading}
                                    />
                                    <span className="checkbox-text">Create searchable PDFs</span>
                                </label>
                            </div>
                        </div>

                        <div className="upload-actions">
                            <button 
                                className="secondary-button"
                                onClick={() => setActiveView('batchManager')}
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                            <button 
                                className="primary-button"
                                onClick={handleUpload}
                                disabled={uploading || selectedFiles.length === 0}
                            >
                                {uploading ? 'Uploading...' : 'Start Processing'}
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Archive Search Component
const ArchiveSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const { user } = useAuth();

    const performSearch = useCallback(async () => {
        if (!query.trim() || !user?.id) {
            setResults([]);
            return;
        }
        
        setIsSearching(true);
        try {
            const searchResult = await databaseService.searchContent(query.trim());
            if (searchResult.success) {
                setResults(searchResult.data.map(item => ({
                    id: item.page_id,
                    title: `Page ${item.page_number}`,
                    publication: item.publication_name || 'Unknown Publication',
                    date: item.publication_date || 'Unknown Date',
                    page: item.page_number,
                    snippet: item.snippet || 'No preview available',
                    batchName: item.batch_name
                })));
            } else {
                toast.error('Search failed');
                setResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Search failed');
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [query, user]);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim()) {
                performSearch();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, performSearch]);

    return (
        <div className="dashboard-content">
            <h1 className="dashboard-title">Archive Search</h1>
            <Card>
                <CardContent>
                    <div className="search-container">
                        <div className="search-input-wrapper">
                            <Search className="search-icon" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="search-input"
                                placeholder="Search full text and metadata..."
                            />
                        </div>
                        <button onClick={performSearch} className="primary-button">
                            Search
                        </button>
                    </div>
                </CardContent>
            </Card>

            {isSearching && <div className="search-loading">Loading results...</div>}

            {!isSearching && results.length > 0 && (
                <Card>
                    <CardHeader title={`Search Results for "${query}"`} subtitle={`${results.length} articles found`} />
                    <ul className="search-results">
                        {results.map(res => (
                            <li key={res.id} className="search-result-item">
                                <h3 className="result-title">{res.title}</h3>
                                <p className="result-snippet" dangerouslySetInnerHTML={{ __html: res.snippet }}></p>
                                <div className="result-metadata">
                                    <span><Newspaper className="metadata-icon" />{res.publication}</span>
                                    <span><Calendar className="metadata-icon" />{res.date}</span>
                                    <span><Hash className="metadata-icon" />Page {res.page}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
};

// Main Dashboard Component
const Dashboard = () => {
    // Removed unused user variable
    const [activeView, setActiveView] = useState('dashboard');

    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <DashboardOverview setActiveView={setActiveView} />;
            case 'batchManager':
                return <BatchManager setActiveView={setActiveView} />;
            case 'editor':
                return <QAEditor />;
            case 'search':
                return <ArchiveSearch />;
            case 'upload':
                return <UploadView setActiveView={setActiveView} />;
            case 'apitest':
                return <ApiTest />;
            default:
                return <DashboardOverview setActiveView={setActiveView} />;
        }
    };

    return (
        <div className="dashboard-container">
            <DashboardSidebar activeView={activeView} setActiveView={setActiveView} />
            <main className="dashboard-main">
                {renderView()}
            </main>
        </div>
    );
};

export default Dashboard;