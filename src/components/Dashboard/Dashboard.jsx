import React, { useState, useEffect, useCallback } from 'react';
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
  Hash 
} from 'lucide-react';
import './Dashboard.css';

// Mock Data
const mockBatches = [
    { id: 'B001', name: 'Waikato Times - Jan 1955', status: 'Complete', pages: 155, date: '2025-07-01', user: 'Alice', issues: 0 },
    { id: 'B002', name: 'NZ Herald - May 1968', status: 'QA Review', pages: 210, date: '2025-07-02', user: 'Bob', issues: 3 },
    { id: 'B003', name: 'The Dominion Post - Sep 1982', status: 'OCR Processing', pages: 180, date: '2025-07-03', user: 'Charlie', issues: 0 },
    { id: 'B004', name: 'Otago Daily Times - Nov 1971', status: 'Ingesting', pages: 250, date: '2025-07-04', user: 'Alice', issues: 0 },
];

const mockPageDetail = {
    id: 'P01-B002',
    batchId: 'B002',
    pageNumber: 12,
    imageUrl: 'https://placehold.co/800x1200/e2e8f0/4a5568?text=Waikato+Times+-+Jan+10,+1955+-+Page+12',
    ocrStatus: 'Complete',
    extractedText: `WAIKATO, FRIDAY, JULY 4, 2025\n\nLOCAL SPORTS GALA A SUCCESS\n\nThe annual Hamilton sports gala, held yesterday at Claudelands Park, drew a record crowd of over 5,000 spectators. The event, which featured wood-chopping competitions, sheepdog trials, and a variety of track and field events, was hailed as a major success by organizers.\n\nMayor Stevens praised the community spirit, stating, "It's wonderful to see so many families out enjoying the day. This event truly showcases the best of the Waikato."\n\nThe premier event, the 100m sprint, was won by local athlete Johnathan Hayes, who finished with a time of 10.8 seconds. The women's race was taken out by Sarah Miller.\n\nFARMER'S MARKET EXPANSION\n\nPlans were approved this week to expand the Hamilton Farmer's Market. The expansion will add 20 new stalls and a covered seating area. Construction is expected to begin in August and be completed by November, just in time for the busy Christmas season.`,
    metadata: {
        publication: 'NZ Herald',
        date: '1968-05-15',
        page: '12',
        section: 'Local News',
    },
    articles: [
        { id: 'A1', title: 'LOCAL SPORTS GALA A SUCCESS', status: 'Verified' },
        { id: 'A2', title: 'FARMER\'S MARKET EXPANSION', status: 'Needs Review' },
    ]
};

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
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Folder },
        { id: 'batchManager', label: 'Batch Manager', icon: Newspaper },
        { id: 'editor', label: 'QA Editor', icon: CheckCircle2 },
        { id: 'search', label: 'Archive Search', icon: Search },
    ];

    const settingsItems = [
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

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
                        {settingsItems.map(item => <NavLink key={item.id} item={item} />)}
                    </nav>
                </div>
            </div>
        </div>
    );
};

// Dashboard Overview Component
const DashboardOverview = ({ setActiveView }) => {
    const stats = [
        { name: 'Batches in Progress', stat: '3', icon: Clock },
        { name: 'Pages Digitized (24h)', stat: '1,284', icon: Newspaper },
        { name: 'QA Queue', stat: '1 Batch', icon: Search },
        { name: 'Total Archived Pages', stat: '1,452,109', icon: CheckCircle2 },
    ];

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
                                <th>Assigned To</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockBatches.map((batch) => (
                                <tr key={batch.id}>
                                    <td className="batch-name">{batch.name}</td>
                                    <td><StatusBadge status={batch.status} /></td>
                                    <td>{batch.pages}</td>
                                    <td>{batch.user}</td>
                                    <td className="table-actions">
                                        <button onClick={() => setActiveView('editor')} className="view-link">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// Batch Manager Component
const BatchManager = ({ setActiveView }) => {
    return (
        <div className="dashboard-content">
            <div className="content-header">
                <h1 className="dashboard-title">Batch Manager</h1>
                <button className="primary-button">
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
                                <th>Issues</th>
                                <th>Assigned To</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockBatches.map((batch) => (
                                <tr key={batch.id}>
                                    <td className="batch-name">{batch.name}</td>
                                    <td><StatusBadge status={batch.status} /></td>
                                    <td>{batch.pages}</td>
                                    <td>
                                        <span className={`issue-count ${batch.issues > 0 ? 'has-issues' : ''}`}>
                                            {batch.issues}
                                        </span>
                                    </td>
                                    <td>{batch.user}</td>
                                    <td className="table-actions">
                                        <button onClick={() => setActiveView('editor')} className="view-link">
                                            {batch.status === 'QA Review' ? 'Review' : 'View'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// QA Editor Component
const QAEditor = () => {
    const [page] = useState(mockPageDetail); // Removed setPage since it's not used
    const [activeTab, setActiveTab] = useState('ocr');
    const [editedText, setEditedText] = useState(page.extractedText);
    const [editedMeta, setEditedMeta] = useState(page.metadata);

    const handleMetaChange = (e) => {
        setEditedMeta({ ...editedMeta, [e.target.name]: e.target.value });
    };

    return (
        <div className="editor-container">
            <div className="editor-header">
                <div>
                    <h1 className="dashboard-title">QA Editor</h1>
                    <p className="editor-subtitle">
                        Reviewing: <span className="batch-info">{mockBatches.find(b => b.id === page.batchId).name} - Page {page.pageNumber}</span>
                    </p>
                </div>
                <div className="editor-actions">
                    <button className="secondary-button">Reject Page</button>
                    <button className="primary-button">Approve & Next</button>
                </div>
            </div>

            <div className="editor-layout">
                {/* Image Viewer */}
                <Card className="image-viewer">
                    <CardHeader title="Scanned Image" />
                    <CardContent className="image-content">
                        <div className="image-container">
                            <img src={page.imageUrl} alt={`Scanned page ${page.pageNumber}`} className="scanned-image" />
                        </div>
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
                                <label htmlFor="ocrText" className="form-label">Extracted Text (Editable)</label>
                                <textarea
                                    id="ocrText"
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="ocr-textarea"
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
                                        {page.articles.map(article => (
                                            <li key={article.id} className="article-item">
                                                <p className="article-title">{article.title}</p>
                                                <StatusBadge status={article.status} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        )}
                    </div>
                </Card>
            </div>
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

// Archive Search Component
const ArchiveSearch = () => {
    const [query, setQuery] = useState('Hamilton sports gala');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const performSearch = useCallback(() => {
        if (!query) return;
        setIsSearching(true);
        setTimeout(() => {
            setResults([
                { id: 1, title: 'LOCAL SPORTS GALA A SUCCESS', publication: 'NZ Herald', date: '1968-05-15', page: 12, snippet: '...annual Hamilton <strong>sports gala</strong>, held yesterday at Claudelands Park, drew a record crowd...'},
                { id: 2, title: 'Sports Results', publication: 'Waikato Times', date: '1955-01-20', page: 8, snippet: '...Results from the Hamilton regional <strong>sports</strong> event...'},
                { id: 3, title: 'City Council Approves Gala Funding', publication: 'The Dominion Post', date: '1982-09-03', page: 4, snippet: '...funding for the upcoming summer <strong>gala</strong> was approved...'},
            ]);
            setIsSearching(false);
        }, 1000);
    }, [query]); // Added query as dependency
    
    useEffect(() => {
        performSearch();
    }, [performSearch]); // Now depends on performSearch which includes query

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