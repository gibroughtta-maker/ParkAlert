import * as Location from 'expo-location'
import { ParkingLocation, LocationCoords } from '../types'
import { PARKING_CONSTANTS } from '../constants'

export class LocationService {
  private static watchSubscription: Location.LocationSubscription | null = null

  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      return status === 'granted'
    } catch (error) {
      console.error('Error requesting location permissions:', error)
      return false
    }
  }

  static async getCurrentLocation(): Promise<LocationCoords | null> {
    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        throw new Error('Location permission denied')
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      }
    } catch (error) {
      console.error('Error getting current location:', error)
      return null
    }
  }

  static async reverseGeocode(coords: LocationCoords): Promise<string | null> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      })

      if (results.length > 0) {
        const result = results[0]
        return [
          result.streetNumber,
          result.street,
          result.city,
          result.region,
        ].filter(Boolean).join(', ')
      }

      return null
    } catch (error) {
      console.error('Error reverse geocoding:', error)
      return null
    }
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const earthRadiusMeters = 6371000
    const latitudeDelta = this.toRadians(lat2 - lat1)
    const longitudeDelta = this.toRadians(lon2 - lon1)
    const lat1Radians = this.toRadians(lat1)
    const lat2Radians = this.toRadians(lat2)

    const haversine =
      Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
      Math.cos(lat1Radians) * Math.cos(lat2Radians) *
      Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2)

    const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
    return earthRadiusMeters * angularDistance
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  static shouldTriggerAlert(
    parkingLocation: ParkingLocation,
    currentLocation: LocationCoords
  ): boolean {
    const distance = this.calculateDistance(
      parkingLocation.latitude,
      parkingLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    )

    return distance > (parkingLocation.alert_radius || PARKING_CONSTANTS.DEFAULT_ALERT_RADIUS)
  }

  static async startLocationWatching(
    parkingLocation: ParkingLocation,
    onLocationUpdate: (location: LocationCoords, shouldAlert: boolean, distance: number) => void
  ): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        throw new Error('Location permission denied')
      }

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: PARKING_CONSTANTS.LOCATION_UPDATE_INTERVAL,
          distanceInterval: 10,
        },
        (location) => {
          const coords: LocationCoords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
          }

          const distance = this.calculateDistance(
            parkingLocation.latitude,
            parkingLocation.longitude,
            coords.latitude,
            coords.longitude
          )

          const shouldAlert = this.shouldTriggerAlert(parkingLocation, coords)
          onLocationUpdate(coords, shouldAlert, distance)
        }
      )
    } catch (error) {
      console.error('Error starting location watching:', error)
      throw error
    }
  }

  static stopLocationWatching(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove()
      this.watchSubscription = null
    }
  }
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return LocationService.calculateDistance(lat1, lon1, lat2, lon2)
}
