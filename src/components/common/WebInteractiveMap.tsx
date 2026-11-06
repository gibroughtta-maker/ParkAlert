import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors, spacing, typography, borderRadius } from '../../constants'

interface WebInteractiveMapProps {
  parkingLocation?: {
    latitude: number
    longitude: number
    address?: string | null
  } | null
  currentLocation?: {
    latitude: number
    longitude: number
  } | null
  onRefreshLocation?: () => void
  isLoading?: boolean
}

export const WebInteractiveMap: React.FC<WebInteractiveMapProps> = ({
  parkingLocation,
  currentLocation,
  onRefreshLocation,
  isLoading = false,
}) => {
  const hasAnyLocation = Boolean(parkingLocation || currentLocation)

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>Map</Text>
        <Text style={styles.mapTitle}>Interactive Map</Text>
        <Text style={styles.mapSubtitle}>
          {hasAnyLocation
            ? 'Location saved. Open the mobile app for native map navigation.'
            : 'Save your parking location to view it here.'}
        </Text>

        {parkingLocation && (
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>Parked Car</Text>
            <Text style={styles.locationText}>
              {parkingLocation.address ||
                `${parkingLocation.latitude.toFixed(5)}, ${parkingLocation.longitude.toFixed(5)}`}
            </Text>
          </View>
        )}

        {currentLocation && (
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>Current Location</Text>
            <Text style={styles.locationText}>
              {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
            </Text>
          </View>
        )}

        {onRefreshLocation && (
          <TouchableOpacity
            style={[styles.refreshButton, isLoading && styles.refreshButtonDisabled]}
            onPress={onRefreshLocation}
            disabled={isLoading}
          >
            <Text style={styles.refreshButtonText}>{isLoading ? 'Updating...' : 'Refresh Location'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  mapIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
    color: colors.primary,
  },
  mapTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  mapSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  locationCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  locationText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  refreshButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  refreshButtonText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
})
