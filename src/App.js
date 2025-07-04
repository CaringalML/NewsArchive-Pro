import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import AuthGuard from './components/Auth/AuthGuard'
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import Home from './components/Home/Home'
import SignIn from './components/Auth/SignIn'
import SignUp from './components/Auth/SignUp'
import ForgotPassword from './components/Auth/ForgotPassword'
import ResetPassword from './components/Auth/ResetPassword'
import Dashboard from './components/Dashboard/Dashboard'
import CollectionList from './components/Collections/CollectionList'
import UploadForm from './components/NewspaperProcessing/UploadForm'
import Profile from './components/Profile/Profile'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              
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
              <Route 
                path="/dashboard" 
                element={
                  <AuthGuard>
                    <Dashboard />
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
                path="/profile" 
                element={
                  <AuthGuard>
                    <Profile />
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
              
              {/* Fallback Route - Redirect to home for any unknown routes */}
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Footer />
          
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
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App