import { useState, useEffect, useCallback } from 'react'
import { apiService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

/**
 * Hook for managing users with DynamoDB backend
 */
export const useUserManagement = () => {
  const { user: authUser } = useAuth()
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Initialize or get current user based on Supabase auth
  const initializeUser = useCallback(async (userInfo = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      // If no authenticated user, return null
      if (!authUser) {
        setCurrentUser(null)
        return null
      }

      console.log('Initializing user for:', authUser.email)

      // First, try to get existing user by email
      try {
        const existingUserResponse = await apiService.getUserByEmail(authUser.email)
        if (existingUserResponse.data) {
          const userWithAuthId = {
            ...existingUserResponse.data,
            auth_user_id: authUser.id
          }
          setCurrentUser(userWithAuthId)
          console.log('Existing user loaded successfully:', userWithAuthId.user_id)
          return userWithAuthId
        }
      } catch (getError) {
        // User doesn't exist yet, we'll create them
        if (getError.message.includes('404') || getError.message.includes('Not Found')) {
          console.log('User not found, will create new user')
        } else {
          throw getError // Re-throw if it's not a 404 error
        }
      }

      // If user doesn't exist, create a new one
      const userData = {
        name: userInfo.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email,
        message: userInfo.message || 'NewsArchive Pro user'
      }

      console.log('Creating new user:', userData)
      const newUser = await apiService.createUser(userData)
      const userWithAuthId = {
        ...newUser.data,
        auth_user_id: authUser.id
      }
      
      setCurrentUser(userWithAuthId)
      console.log('New user created successfully:', userWithAuthId.user_id)
      return userWithAuthId

    } catch (error) {
      console.error('Failed to initialize user:', error)
      setError(error.message)
      
      // Create a session-based user as fallback
      const fallbackUser = {
        user_id: `temp-${authUser.id}`,
        auth_user_id: authUser.id,
        name: userInfo.name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'User',
        email: authUser?.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        temporary: true
      }
      
      setCurrentUser(fallbackUser)
      console.log('Using temporary user session due to error:', error.message)
      return fallbackUser
    } finally {
      setLoading(false)
    }
  }, [authUser])

  // Get user by ID
  const getUserById = async (userId) => {
    setLoading(true)
    setError(null)
    
    try {
      const user = await apiService.getUser(userId)
      return user.data
    } catch (error) {
      console.error('Failed to get user:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Update current user
  const updateCurrentUser = async (updates) => {
    if (!currentUser) {
      throw new Error('No current user to update')
    }

    setLoading(true)
    setError(null)
    
    try {
      // For now, just update locally since we don't have an update API endpoint yet
      // In a full implementation, you would call apiService.updateUser(currentUser.user_id, updates)
      const updatedUser = { ...currentUser, ...updates, updated_at: new Date().toISOString() }
      
      setCurrentUser(updatedUser)
      
      console.log('User updated successfully')
      return updatedUser
    } catch (error) {
      console.error('Failed to update user:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Logout user
  const logout = () => {
    setCurrentUser(null)
    console.log('Logged out successfully')
  }

  // Initialize user when auth user changes
  useEffect(() => {
    if (authUser) {
      initializeUser()
    } else {
      setCurrentUser(null)
    }
  }, [authUser, initializeUser])

  return {
    currentUser,
    loading,
    error,
    initializeUser,
    getUserById,
    updateCurrentUser,
    logout
  }
}