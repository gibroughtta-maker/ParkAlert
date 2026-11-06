import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { LocationService } from '../services/location'
import { WardenService } from '../services/warden'
import { LocationCoords, ParkingLocation } from '../types'
import { logger } from '../utils/logger'

interface ParkingContextType {
  currentLocation: LocationCoords | null
  parkingLocation: ParkingLocation | null
  isLoading: boolean
  error: string | null
  alertActive: boolean
  alertDistance: number
  setParkedCar: (location: Omit<ParkingLocation, 'id' | 'created_at'>) => Promise<void>
  clearParkedCar: () => Promise<void>
  refreshLocation: () => Promise<void>
  dismissAlert: () => void
  extendAlert: (minutes: number) => void
}

const ParkingContext = createContext<ParkingContextType | undefined>(undefined)

export const useParking = () => {
  const context = useContext(ParkingContext)
  if (context === undefined) {
    throw new Error('useParking must be used within a ParkingProvider')
  }
  return context
}

export const ParkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null)
  const [parkingLocation, setParkingLocation] = useState<ParkingLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alertActive, setAlertActive] = useState(false)
  const [alertDistance, setAlertDistance] = useState(0)

  const refreshLocation = useCallback(async () => {
    setIsLoading(true)
    const coords = await LocationService.getCurrentLocation()
    if (coords) {
      setCurrentLocation(coords)
      setError(null)
    } else {
      setError('Unable to get current location')
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refreshLocation()
  }, [refreshLocation])

  useEffect(() => {
    if (!user) {
      setParkingLocation(null)
      return
    }
    WardenService.getActiveParkingLocation(user.id).then(setParkingLocation)
  }, [user])

  useEffect(() => {
    if (!parkingLocation) return

    LocationService.startLocationWatching(parkingLocation, async (coords, shouldAlert, distance) => {
      setCurrentLocation(coords)
      if (shouldAlert && (await WardenService.canShowAlert())) {
        setAlertDistance(distance)
        setAlertActive(true)
        await WardenService.setAlertCooldown()
      }
    }).catch((err) => {
      logger.error('Error watching location:', err)
    })

    return () => {
      LocationService.stopLocationWatching()
    }
  }, [parkingLocation])

  const setParkedCar = useCallback(async (location: Omit<ParkingLocation, 'id' | 'created_at'>) => {
    const saved = await WardenService.saveParkingLocation(location)
    setParkingLocation(saved)
  }, [])

  const clearParkedCar = useCallback(async () => {
    if (!parkingLocation) return
    try {
      await WardenService.clearParkingLocation(parkingLocation.id)
    } finally {
      setParkingLocation(null)
      setAlertActive(false)
    }
  }, [parkingLocation])

  const dismissAlert = useCallback(() => {
    setAlertActive(false)
  }, [])

  const extendAlert = useCallback((minutes: number) => {
    setAlertActive(false)
    WardenService.extendAlert(minutes)
  }, [])

  return (
    <ParkingContext.Provider
      value={{
        currentLocation,
        parkingLocation,
        isLoading,
        error,
        alertActive,
        alertDistance,
        setParkedCar,
        clearParkedCar,
        refreshLocation,
        dismissAlert,
        extendAlert,
      }}
    >
      {children}
    </ParkingContext.Provider>
  )
}
