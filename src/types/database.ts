export type WardenType = 'council' | 'private' | 'police'
export type CountType = 'one' | 'two' | 'multiple'
export type DirectionType = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
export type MovementType = 'walking' | 'cycling' | 'driving'

export type WardenSighting = {
  id: string
  user_id: string
  lat: number
  lng: number
  warden_type: WardenType
  count: CountType
  direction: DirectionType
  movement: MovementType
  expires_at: string
  created_at: string
}

export type ParkedCar = {
  id: string
  user_id: string
  lat: number
  lng: number
  radius_m: number
  created_at: string
}

export interface LocationCoords {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface ParkingLocation {
  id: string
  user_id: string
  latitude: number
  longitude: number
  address?: string | null
  alert_radius: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      warden_sightings: {
        Row: WardenSighting
        Insert: {
          id?: string
          user_id: string
          lat: number
          lng: number
          warden_type: WardenType
          count: CountType
          direction: DirectionType
          movement: MovementType
          expires_at: string
          created_at?: string
        }
        Update: Partial<WardenSighting>
        Relationships: []
      }
      parked_cars: {
        Row: ParkedCar
        Insert: {
          id?: string
          user_id: string
          lat: number
          lng: number
          radius_m?: number
          created_at?: string
        }
        Update: Partial<ParkedCar>
        Relationships: []
      }
      parking_locations: {
        Row: {
          id: string
          user_id: string
          latitude: number
          longitude: number
          address: string | null
          alert_radius: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          latitude: number
          longitude: number
          address?: string | null
          alert_radius?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          latitude?: number
          longitude?: number
          address?: string | null
          alert_radius?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      parking_sessions: {
        Row: {
          id: string
          user_id: string
          parking_location_id: string
          started_at: string
          ended_at: string | null
          alert_count: number
        }
        Insert: {
          id?: string
          user_id: string
          parking_location_id: string
          started_at?: string
          ended_at?: string | null
          alert_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          parking_location_id?: string
          started_at?: string
          ended_at?: string | null
          alert_count?: number
        }
        Relationships: []
      }
      alert_logs: {
        Row: {
          id: string
          user_id: string
          parking_location_id: string
          distance: number
          alert_type: 'distance' | 'time'
          acknowledged: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          parking_location_id: string
          distance: number
          alert_type: 'distance' | 'time'
          acknowledged?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          parking_location_id?: string
          distance?: number
          alert_type?: 'distance' | 'time'
          acknowledged?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}

export type AlertLog = Database['public']['Tables']['alert_logs']['Row']
