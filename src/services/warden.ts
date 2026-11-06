import AsyncStorage from '@react-native-async-storage/async-storage'
import { RealtimeChannel } from '@supabase/supabase-js'
import {
  ParkingLocation,
  AlertLog,
  ParkedCar,
  WardenSighting,
  WardenType,
  CountType,
  DirectionType,
  MovementType,
} from '../types'
import { supabase } from './supabase'
import { logger } from '../utils/logger'
import { PARKING_CONSTANTS, SIGHTING_EXPIRY_MINUTES } from '../constants'

const WARDEN_SIGHTINGS_TABLE = 'warden_sightings'
const PARKED_CARS_TABLE = 'parked_cars'

export interface NewWardenSighting {
  lat: number
  lng: number
  warden_type: WardenType
  count: CountType
  direction: DirectionType
  movement: MovementType
}

export function getSightingExpiry(movement: MovementType, from: Date = new Date()): string {
  const minutes = SIGHTING_EXPIRY_MINUTES[movement]
  return new Date(from.getTime() + minutes * 60 * 1000).toISOString()
}

export async function getActiveWardenSightings(): Promise<WardenSighting[]> {
  try {
    const { data, error } = await supabase
      .from(WARDEN_SIGHTINGS_TABLE)
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as WardenSighting[]
  } catch (error) {
    logger.error('Error fetching active warden sightings:', error)
    return []
  }
}

export async function createWardenSighting(
  sighting: NewWardenSighting,
  userId: string
): Promise<WardenSighting | null> {
  try {
    const { data, error } = await supabase
      .from(WARDEN_SIGHTINGS_TABLE)
      .insert({
        ...sighting,
        user_id: userId,
        expires_at: getSightingExpiry(sighting.movement),
      })
      .select()
      .single()

    if (error) throw error
    return data as WardenSighting
  } catch (error) {
    logger.error('Error creating warden sighting:', error)
    return null
  }
}

export function subscribeToWardenSightings(
  onInsert: (sighting: WardenSighting) => void,
  onDelete: (id: string) => void
): RealtimeChannel {
  return supabase
    .channel('warden_sightings_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: WARDEN_SIGHTINGS_TABLE },
      (payload) => {
        onInsert(payload.new as WardenSighting)
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: WARDEN_SIGHTINGS_TABLE },
      (payload) => {
        const id = (payload.old as Partial<WardenSighting>).id
        if (id) onDelete(id)
      }
    )
    .subscribe()
}

export async function getParkedCar(userId: string): Promise<ParkedCar | null> {
  try {
    const { data, error } = await supabase
      .from(PARKED_CARS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return (data as ParkedCar | null) ?? null
  } catch (error) {
    logger.error('Error fetching parked car:', error)
    return null
  }
}

export async function setParkedCar(
  location: { lat: number; lng: number },
  userId: string
): Promise<ParkedCar | null> {
  try {
    // One parked car per user: a new mark replaces the old one (产品需求.md §5.2)
    const { data, error } = await supabase
      .from(PARKED_CARS_TABLE)
      .upsert(
        {
          user_id: userId,
          lat: location.lat,
          lng: location.lng,
          radius_m: PARKING_CONSTANTS.ALERT_RADIUS_METERS,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) throw error
    return data as ParkedCar
  } catch (error) {
    logger.error('Error saving parked car:', error)
    return null
  }
}

export async function removeParkedCar(userId: string): Promise<void> {
  const { error } = await supabase
    .from(PARKED_CARS_TABLE)
    .delete()
    .eq('user_id', userId)

  if (error) {
    logger.error('Error removing parked car:', error)
    throw error
  }
}

export class WardenService {
  private static alertCooldownKey = 'last_alert_time'
  private static parkingLocationKey = 'parking_location'

  static async saveParkingLocation(location: Omit<ParkingLocation, 'id' | 'created_at'>): Promise<ParkingLocation> {
    try {
      const { data, error } = await supabase
        .from('parking_locations')
        .insert(location)
        .select()
        .single()

      if (error) throw error

      const parkingLocation = data as ParkingLocation
      await AsyncStorage.setItem(this.parkingLocationKey, JSON.stringify(parkingLocation))
      return parkingLocation
    } catch (error) {
      logger.error('Error saving parking location:', error)
      const fallbackLocation: ParkingLocation = {
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...location,
      }
      await AsyncStorage.setItem(this.parkingLocationKey, JSON.stringify(fallbackLocation))
      return fallbackLocation
    }
  }

  static async getActiveParkingLocation(userId: string): Promise<ParkingLocation | null> {
    try {
      const { data, error } = await supabase
        .from('parking_locations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        const parkingLocation = data as ParkingLocation
        await AsyncStorage.setItem(this.parkingLocationKey, JSON.stringify(parkingLocation))
        return parkingLocation
      }

      const cachedLocation = await this.getCachedParkingLocation()
      if (cachedLocation?.user_id === userId && cachedLocation.is_active) {
        return cachedLocation
      }

      return null
    } catch (error) {
      logger.error('Error getting active parking location:', error)
      const cachedLocation = await this.getCachedParkingLocation()
      if (cachedLocation?.user_id === userId && cachedLocation.is_active) {
        return cachedLocation
      }
      return null
    }
  }

  static async clearParkingLocation(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('parking_locations')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      await AsyncStorage.removeItem(this.parkingLocationKey)
    } catch (error) {
      logger.error('Error clearing parking location:', error)
      const cachedLocation = await this.getCachedParkingLocation()
      if (cachedLocation?.id === id) {
        await AsyncStorage.setItem(
          this.parkingLocationKey,
          JSON.stringify({ ...cachedLocation, is_active: false })
        )
      }
      throw error
    }
  }

  static async logAlert(alertLog: Omit<AlertLog, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('alert_logs')
        .insert(alertLog)

      if (error) throw error
    } catch (error) {
      logger.error('Error logging alert:', error)
    }
  }

  static shouldShowAlert(distance: number, alertRadius: number): boolean {
    return distance > alertRadius
  }

  static async canShowAlert(): Promise<boolean> {
    try {
      const lastAlertTime = await AsyncStorage.getItem(this.alertCooldownKey)
      if (!lastAlertTime) return true

      const lastAlert = new Date(lastAlertTime)
      const now = new Date()
      const minutesSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60)

      return minutesSinceLastAlert >= PARKING_CONSTANTS.ALERT_COOLDOWN_MINUTES
    } catch (error) {
      logger.error('Error checking alert cooldown:', error)
      return true
    }
  }

  static async setAlertCooldown(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.alertCooldownKey, new Date().toISOString())
    } catch (error) {
      logger.error('Error setting alert cooldown:', error)
    }
  }

  static async extendAlert(minutes: number): Promise<void> {
    try {
      const futureTime = new Date(Date.now() + minutes * 60 * 1000)
      await AsyncStorage.setItem(this.alertCooldownKey, futureTime.toISOString())
    } catch (error) {
      logger.error('Error extending alert:', error)
    }
  }

  static async getCachedParkingLocation(): Promise<ParkingLocation | null> {
    try {
      const cached = await AsyncStorage.getItem(this.parkingLocationKey)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.error('Error getting cached parking location:', error)
      return null
    }
  }
}
