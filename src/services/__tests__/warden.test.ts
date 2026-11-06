import {
  createWardenSighting,
  getActiveWardenSightings,
  getSightingExpiry,
  subscribeToWardenSightings,
} from '../warden'
import { supabase } from '../supabase'

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}))

const mockedSupabase = supabase as unknown as {
  from: jest.Mock
  channel: jest.Mock
}

const sighting = {
  id: 'sighting-1',
  user_id: 'user-1',
  lat: 55.8642,
  lng: -4.2518,
  warden_type: 'council' as const,
  count: 'two' as const,
  direction: 'NE' as const,
  movement: 'walking' as const,
  expires_at: '2026-01-01T13:00:00.000Z',
  created_at: '2026-01-01T12:00:00.000Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getSightingExpiry', () => {
  const from = new Date('2026-01-01T12:00:00.000Z')

  it('uses movement-based expiry from the product spec', () => {
    expect(getSightingExpiry('walking', from)).toBe('2026-01-01T13:00:00.000Z')
    expect(getSightingExpiry('cycling', from)).toBe('2026-01-01T12:45:00.000Z')
    expect(getSightingExpiry('driving', from)).toBe('2026-01-01T12:30:00.000Z')
  })
})

describe('getActiveWardenSightings', () => {
  it('queries only sightings whose expires_at is in the future', async () => {
    const order = jest.fn().mockResolvedValue({ data: [sighting], error: null })
    const gt = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ gt })
    mockedSupabase.from.mockReturnValue({ select })

    const result = await getActiveWardenSightings()

    expect(mockedSupabase.from).toHaveBeenCalledWith('warden_sightings')
    expect(gt).toHaveBeenCalledWith('expires_at', expect.any(String))
    expect(result).toEqual([sighting])
  })

  it('returns an empty list on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: new Error('boom') })
    mockedSupabase.from.mockReturnValue({
      select: () => ({ gt: () => ({ order }) }),
    })

    await expect(getActiveWardenSightings()).resolves.toEqual([])
  })
})

describe('createWardenSighting', () => {
  it('inserts with user_id and a computed expires_at', async () => {
    const single = jest.fn().mockResolvedValue({ data: sighting, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const insert = jest.fn().mockReturnValue({ select })
    mockedSupabase.from.mockReturnValue({ insert })

    const before = Date.now()
    const result = await createWardenSighting(
      {
        lat: sighting.lat,
        lng: sighting.lng,
        warden_type: 'council',
        count: 'two',
        direction: 'NE',
        movement: 'driving',
      },
      'user-1'
    )

    expect(result).toEqual(sighting)
    const payload = insert.mock.calls[0][0]
    expect(payload.user_id).toBe('user-1')
    const expiresMs = new Date(payload.expires_at).getTime()
    expect(expiresMs - before).toBeGreaterThanOrEqual(30 * 60 * 1000 - 1000)
    expect(expiresMs - before).toBeLessThanOrEqual(30 * 60 * 1000 + 1000)
  })

  it('returns null when the insert fails', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: new Error('rls') })
    mockedSupabase.from.mockReturnValue({
      insert: () => ({ select: () => ({ single }) }),
    })

    const result = await createWardenSighting(
      {
        lat: 0,
        lng: 0,
        warden_type: 'police',
        count: 'one',
        direction: 'S',
        movement: 'walking',
      },
      'user-1'
    )

    expect(result).toBeNull()
  })
})

describe('subscribeToWardenSightings', () => {
  it('subscribes to INSERT and DELETE postgres_changes and forwards payloads', () => {
    const handlers: Record<string, (payload: any) => void> = {}
    const channel: any = {
      on: jest.fn((_type: string, filter: { event: string }, cb: (payload: any) => void) => {
        handlers[filter.event] = cb
        return channel
      }),
      subscribe: jest.fn(() => channel),
    }
    mockedSupabase.channel.mockReturnValue(channel)

    const onInsert = jest.fn()
    const onDelete = jest.fn()
    const result = subscribeToWardenSightings(onInsert, onDelete)

    expect(result).toBe(channel)
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', schema: 'public', table: 'warden_sightings' }),
      expect.any(Function)
    )
    expect(channel.subscribe).toHaveBeenCalled()

    handlers.INSERT({ new: sighting })
    handlers.DELETE({ old: { id: 'sighting-1' } })

    expect(onInsert).toHaveBeenCalledWith(sighting)
    expect(onDelete).toHaveBeenCalledWith('sighting-1')
  })
})
