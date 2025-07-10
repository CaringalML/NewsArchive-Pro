import { useState, useEffect, useCallback } from 'react'
import { apiService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

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

      // Try to create a new user with Supabase auth data
      const userData = {
        name: userInfo.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email,
        message: userInfo.message || 'NewsArchive Pro user'
      }

      try {
        const newUser = await apiService.createUser(userData)
        
        // Add auth user ID to the user data
        const userWithAuthId = {
          ...newUser.data,
          auth_user_id: authUser.id
        }
        
        setCurrentUser(userWithAuthId)
        console.log('User initialized successfully from database')
        return userWithAuthId
      } catch (createError) {
        // If user already exists (409 error), try to get the existing user
        if (createError.message.includes('already exists')) {
          try {
            // Try to get user by email since they already exist
            const existingUsers = await apiService.getUsers()
            const existingUser = existingUsers.data?.find(u => u.email === authUser.email)
            
            if (existingUser) {
              const userWithAuthId = {
                ...existingUser,
                auth_user_id: authUser.id
              }
              
              setCurrentUser(userWithAuthId)
              console.log('Existing user loaded from database')
              return userWithAuthId
            }
          } catch (getError) {
            console.error('Failed to get existing user:', getError)
          }
        }
        
        // If all else fails, throw the original error
        throw createError
      }
    } catch (error) {
      console.error('Failed to initialize user:', error)
      setError(error.message)
      
      // Create a fallback user if API fails (this will not persist across sessions)
      const fallbackUser = {
        user_id: 'fallback-user-' + Date.now(),
        auth_user_id: authUser?.id,
        name: userInfo.name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'Offline User',
        email: authUser?.email || 'offline@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setCurrentUser(fallbackUser)
      toast.error('Database connection failed - using temporary session')
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
      
      toast.success('User updated successfully')
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
    toast.success('Logged out successfully')
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

/**
 * Hook for managing locations with DynamoDB backend
 */
export const useLocationManagement = () => {
  const [locations, setLocations] = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Create a new location
  const createLocation = async (locationData) => {
    setLoading(true)
    setError(null)
    
    try {
      const newLocation = await apiService.createLocation(locationData)
      setLocations(prev => [...prev, newLocation.data])
      toast.success('Location created successfully')
      return newLocation.data
    } catch (error) {
      console.error('Failed to create location:', error)
      setError(error.message)
      toast.error('Failed to create location')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Get location by ID
  const getLocationById = async (locationId) => {
    setLoading(true)
    setError(null)
    
    try {
      const location = await apiService.getLocation(locationId)
      return location.data
    } catch (error) {
      console.error('Failed to get location:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Initialize default location for user
  const initializeDefaultLocation = async (userId) => {
    setLoading(true)
    setError(null)
    
    try {
      // Try to get existing locations for the user first
      try {
        const userLocationsResponse = await apiService.getLocationsByUser(userId)
        if (userLocationsResponse.data && userLocationsResponse.data.length > 0) {
          const defaultLocation = userLocationsResponse.data[0] // Use first location as default
          setCurrentLocation(defaultLocation)
          console.log('Loaded existing default location from database')
          return defaultLocation
        }
      } catch (getError) {
        console.log('No existing locations found, creating default location')
      }

      // Create default location if none exists
      const defaultLocationData = {
        user_id: userId,
        name: 'Default Collection',
        type: 'folder',
        parent_id: null,
        path: '/'
      }

      const newLocation = await createLocation(defaultLocationData)
      setCurrentLocation(newLocation)
      console.log('Created new default location in database')
      
      return newLocation
    } catch (error) {
      console.error('Failed to initialize default location:', error)
      
      // Create fallback location if API fails (this will not persist across sessions)
      const fallbackLocation = {
        location_id: 'fallback-location-' + Date.now(),
        user_id: userId,
        name: 'Temporary Collection',
        type: 'folder',
        parent_id: null,
        path: '/',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setCurrentLocation(fallbackLocation)
      toast.error('Database connection failed - using temporary collection')
      
      return fallbackLocation
    } finally {
      setLoading(false)
    }
  }

  // Get locations for user
  const getLocationsForUser = async (userId) => {
    setLoading(true)
    setError(null)
    
    try {
      // For now, we'll use the default location
      // In a full implementation, you would add an API endpoint to get user locations
      const defaultLocation = await initializeDefaultLocation(userId)
      setLocations([defaultLocation])
      return [defaultLocation]
    } catch (error) {
      console.error('Failed to get locations:', error)
      setError(error.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  return {
    locations,
    currentLocation,
    loading,
    error,
    createLocation,
    getLocationById,
    initializeDefaultLocation,
    getLocationsForUser,
    setCurrentLocation
  }
}