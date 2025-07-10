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

      // Check if user exists in localStorage
      const storedUser = localStorage.getItem('newsarchive_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        // Verify stored user matches current auth user
        if (userData.auth_user_id === authUser.id) {
          setCurrentUser(userData)
          return userData
        }
      }

      // Try to create a new user with Supabase auth data
      const userData = {
        name: userInfo.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
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
        
        // Store user in localStorage
        localStorage.setItem('newsarchive_user', JSON.stringify(userWithAuthId))
        setCurrentUser(userWithAuthId)
        
        toast.success('User initialized successfully')
        return userWithAuthId
      } catch (createError) {
        // If user already exists (409 error), try to get the existing user
        if (createError.message.includes('already exists')) {
          try {
            // Try to get user by email since they already exist
            const existingUsers = await apiService.getUsers()
            const existingUser = existingUsers.data.find(u => u.email === authUser.email)
            
            if (existingUser) {
              const userWithAuthId = {
                ...existingUser,
                auth_user_id: authUser.id
              }
              
              // Store user in localStorage
              localStorage.setItem('newsarchive_user', JSON.stringify(userWithAuthId))
              setCurrentUser(userWithAuthId)
              
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
      
      // Create a fallback user if API fails
      const fallbackUser = {
        user_id: 'fallback-user-' + Date.now(),
        auth_user_id: authUser?.id,
        name: userInfo.name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'Offline User',
        email: authUser?.email || 'offline@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      localStorage.setItem('newsarchive_user', JSON.stringify(fallbackUser))
      setCurrentUser(fallbackUser)
      
      toast.error('Using offline mode')
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
      const updatedUser = { ...currentUser, ...updates, updated_at: new Date().toISOString() }
      
      // Update in localStorage
      localStorage.setItem('newsarchive_user', JSON.stringify(updatedUser))
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
    localStorage.removeItem('newsarchive_user')
    localStorage.removeItem('newsarchive_default_location')
    setCurrentUser(null)
    toast.success('Logged out successfully')
  }

  // Initialize user when auth user changes
  useEffect(() => {
    if (authUser) {
      initializeUser()
    } else {
      setCurrentUser(null)
      localStorage.removeItem('newsarchive_user')
      localStorage.removeItem('newsarchive_default_location')
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
      // Check if default location exists in localStorage
      const storedLocation = localStorage.getItem('newsarchive_default_location')
      if (storedLocation) {
        const locationData = JSON.parse(storedLocation)
        setCurrentLocation(locationData)
        return locationData
      }

      // Create default location
      const defaultLocationData = {
        user_id: userId,
        name: 'Default Collection',
        type: 'folder',
        parent_id: null,
        path: '/'
      }

      const newLocation = await createLocation(defaultLocationData)
      
      // Store in localStorage
      localStorage.setItem('newsarchive_default_location', JSON.stringify(newLocation))
      setCurrentLocation(newLocation)
      
      return newLocation
    } catch (error) {
      console.error('Failed to initialize default location:', error)
      
      // Create fallback location if API fails
      const fallbackLocation = {
        location_id: 'fallback-location-' + Date.now(),
        user_id: userId,
        name: 'Offline Collection',
        type: 'folder',
        parent_id: null,
        path: '/',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      localStorage.setItem('newsarchive_default_location', JSON.stringify(fallbackLocation))
      setCurrentLocation(fallbackLocation)
      
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