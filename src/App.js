import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import AuthGuard from './components/Auth/AuthGuard'
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import SearchEngine from './components/SearchEngine/SearchEngine'
import Home from './components/Home/Home'
import SignIn from './components/Auth/SignIn'
import SignUp from './components/Auth/SignUp'
import ForgotPassword from './components/Auth/ForgotPassword'
import ResetPassword from './components/Auth/ResetPassword'
import EmailVerified from './components/Auth/EmailVerified'
import EmailVerificationPending from './components/Auth/EmailVerificationPending'
import DashboardTemplate from './components/Dashboard/DashboardTemplate'
import CollectionList from './components/Collections/CollectionList'
import UploadForm from './components/NewspaperProcessing/UploadForm'
import Profile from './components/Profile/Profile'
import ApiTest from './components/ApiTest'
import RealtimeDashboard from './components/Dashboard/RealtimeDashboard'
import './App.css'

// Component to conditionally render header based on route
const AppLayout = ({ children }) => {
  const location = useLocation()
  
  // Routes where header should be hidden
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/email-verified', '/verify-email']
  const dashboardRoutes = ['/dashboard'] // Hide header for the new dashboard
  const noHeaderRoutes = ['/', ...authRoutes, ...dashboardRoutes]
  const hideHeader = noHeaderRoutes.includes(location.pathname)
  
  // Routes where footer should be hidden
  const noFooterRoutes = [...dashboardRoutes]
  const hideFooter = noFooterRoutes.includes(location.pathname)
  
  return (
    <div className="App">
      {!hideHeader && <Header />}
      <main className="main-content">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            {/* Root - Search Engine Page */}
            <Route path="/" element={<SearchEngine />} />
            
            {/* Home page moved to /home */}
            <Route path="/home" element={<Home />} />
            
            {/* Auth Routes - Only accessible when not authenticated */}
            <Route 
              path="/login" 
              element={
                <AuthGuard requireAuth={false}>
                  <div className="auth-page">
                    <SignIn />
                  </div>
                </AuthGuard>
              } 
            />
            <Route 
              path="/register" 
              element={
                <AuthGuard requireAuth={false}>
                  <div className="auth-page">
                    <SignUp />
                  </div>
                </AuthGuard>
              } 
            />
            <Route 
              path="/forgot-password" 
              element={
                <AuthGuard requireAuth={false}>
                  <div className="auth-page">
                    <ForgotPassword />
                  </div>
                </AuthGuard>
              } 
            />
            
            {/* Email Verification Routes - Accessible to all users */}
            <Route 
              path="/email-verified" 
              element={<EmailVerified />} 
            />
            <Route 
              path="/verify-email" 
              element={<EmailVerificationPending />} 
            />
            
            {/* Reset Password Route - Special handling for both authenticated and unauthenticated users */}
            <Route 
              path="/reset-password" 
              element={
                <div className="auth-page">
                  <ResetPassword />
                </div>
              } 
            />
            
            {/* Protected Routes - Only accessible when authenticated */}
            {/* Updated Dashboard Route - Full Control Panel */}
            <Route 
              path="/dashboard" 
              element={
                <AuthGuard>
                  <DashboardTemplate />
                </AuthGuard>
              } 
            />
            <Route 
              path="/collections" 
              element={
                <AuthGuard>
                  <CollectionList />
                </AuthGuard>
              } 
            />
            <Route 
              path="/processing" 
              element={
                <AuthGuard>
                  <UploadForm />
                </AuthGuard>
              } 
            />
            <Route 
              path="/ocr-jobs" 
              element={
                <AuthGuard>
                  <RealtimeDashboard />
                </AuthGuard>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              } 
            />
            <Route 
              path="/api-test" 
              element={
                <AuthGuard>
                  <ApiTest />
                </AuthGuard>
              } 
            />
            
            {/* Public Pages (could be added later) */}
            <Route path="/features" element={<div className="page"><div className="container"><h1>Features - Coming Soon</h1></div></div>} />
            <Route path="/pricing" element={<div className="page"><div className="container"><h1>Pricing - Coming Soon</h1></div></div>} />
            <Route path="/about" element={<div className="page"><div className="container"><h1>About - Coming Soon</h1></div></div>} />
            <Route path="/contact" element={<div className="page"><div className="container"><h1>Contact - Coming Soon</h1></div></div>} />
            <Route path="/help" element={<div className="page"><div className="container"><h1>Help - Coming Soon</h1></div></div>} />
            <Route path="/docs" element={<div className="page"><div className="container"><h1>Documentation - Coming Soon</h1></div></div>} />
            <Route path="/search" element={<div className="page"><div className="container"><h1>Search Results - Coming Soon</h1></div></div>} />
            <Route path="/privacy" element={<div className="page"><div className="container"><h1>Privacy Policy - Coming Soon</h1></div></div>} />
            <Route path="/terms" element={<div className="page"><div className="container"><h1>Terms of Service - Coming Soon</h1></div></div>} />
            
            {/* Fallback Route - Redirect to search engine for any unknown routes */}
            <Route path="*" element={<SearchEngine />} />
          </Routes>
        </AppLayout>
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </Router>
    </AuthProvider>
  )
}

export default App