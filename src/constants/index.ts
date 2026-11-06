import type { WardenType, CountType, DirectionType, MovementType } from '../types/database'

export const colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#FFFFFF',
  surface: '#F2F2F7',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
}

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
}

export const PARKING_CONSTANTS = {
  ALERT_RADIUS_METERS: 150,
  DEFAULT_ALERT_RADIUS: 150,
  LOCATION_UPDATE_INTERVAL: 30000,
  MAX_PARKING_DURATION: 24 * 60 * 60 * 1000,
  ALERT_COOLDOWN_MINUTES: 15,
}

export const ALERT_RADIUS_METERS = PARKING_CONSTANTS.ALERT_RADIUS_METERS
export const ALERT_COOLDOWN_MINUTES = PARKING_CONSTANTS.ALERT_COOLDOWN_MINUTES

export const WARDEN_TYPES: ReadonlyArray<{ value: WardenType; label: string }> = [
  { value: 'council', label: 'Council Warden' },
  { value: 'private', label: 'Private Parking' },
  { value: 'police', label: 'Police' },
]

export const COUNT_OPTIONS: ReadonlyArray<{ value: CountType; label: string }> = [
  { value: 'one', label: '1' },
  { value: 'two', label: '2' },
  { value: 'multiple', label: 'Multiple' },
]

export const DIRECTION_OPTIONS: ReadonlyArray<DirectionType> = [
  'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW',
]

export const MOVEMENT_TYPES: ReadonlyArray<{ value: MovementType; label: string }> = [
  { value: 'walking', label: 'Walking' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'driving', label: 'Driving' },
]

// Sighting expiry is system-calculated from movement type (产品需求.md §5.1)
export const SIGHTING_EXPIRY_MINUTES: Record<MovementType, number> = {
  walking: 60,
  cycling: 45,
  driving: 30,
}
