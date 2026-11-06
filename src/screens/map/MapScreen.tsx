import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { useParking } from '../../contexts/ParkingContext'
import { useAuth } from '../../contexts/AuthContext'
import { WebInteractiveMap } from '../../components/common/WebInteractiveMap'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { AlertModal } from '../../components/alerts/AlertModal'
import { colors, spacing, typography, borderRadius, PARKING_CONSTANTS } from '../../constants'

export const MapScreen: React.FC = () => {
  const navigation = useNavigation()
  const { user } = useAuth()
  const {
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
  } = useParking()

  const [mapRegion, setMapRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })

  useEffect(() => {
    if (currentLocation) {
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      })
    }
  }, [currentLocation])

  const handleParkHere = async () => {
    if (!user || !currentLocation) {
      Alert.alert('Error', 'Unable to get current location')
      return
    }

    try {
      await setParkedCar({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        user_id: user.id,
        alert_radius: PARKING_CONSTANTS.ALERT_RADIUS_METERS,
        is_active: true,
      })
      Alert.alert('Success', 'Parking location saved!')
    } catch (error) {
      Alert.alert('Error', 'Failed to save parking location')
    }
  }

  const handleClearParking = () => {
    Alert.alert(
      'Clear Parking Location',
      'Are you sure you want to clear your parking location?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearParkedCar },
      ]
    )
  }

  if (isLoading && !currentLocation) {
    return <LoadingScreen />
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <WebInteractiveMap
          parkingLocation={parkingLocation}
          currentLocation={currentLocation}
          onRefreshLocation={refreshLocation}
          isLoading={isLoading}
        />
      ) : (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {parkingLocation && (
            <>
              <Marker
                coordinate={{
                  latitude: parkingLocation.latitude,
                  longitude: parkingLocation.longitude,
                }}
                title="Parked Car"
                description={parkingLocation.address || 'Your car is parked here'}
              >
                <Ionicons name="car" size={32} color={colors.primary} />
              </Marker>
              <Circle
                center={{
                  latitude: parkingLocation.latitude,
                  longitude: parkingLocation.longitude,
                }}
                radius={parkingLocation.alert_radius}
                strokeColor={colors.primary}
                fillColor={`${colors.primary}20`}
              />
            </>
          )}
        </MapView>
      )}

      <View style={styles.overlay}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {parkingLocation && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="car" size={24} color={colors.primary} />
              <Text style={styles.infoTitle}>Car Parked</Text>
            </View>
            {parkingLocation.address && (
              <Text style={styles.infoAddress}>{parkingLocation.address}</Text>
            )}
            <Text style={styles.infoText}>
              Alert radius: {parkingLocation.alert_radius}m
            </Text>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearParking}
            >
              <Text style={styles.clearButtonText}>Clear Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.secondaryFab]}
          onPress={() => navigation.navigate('Settings' as never)}
        >
          <Ionicons name="settings" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, parkingLocation && styles.fabDisabled]}
          onPress={parkingLocation ? undefined : handleParkHere}
          disabled={!!parkingLocation || isLoading}
        >
          <Ionicons 
            name={parkingLocation ? 'checkmark' : 'car'} 
            size={32} 
            color={colors.background} 
          />
        </TouchableOpacity>
      </View>

      <AlertModal
        visible={alertActive}
        distance={alertDistance}
        onDismiss={dismissAlert}
        onExtend={extendAlert}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
  errorContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.error,
    fontSize: typography.sizes.sm,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoTitle: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  infoAddress: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  clearButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: colors.background,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
  },
  fabDisabled: {
    backgroundColor: colors.success,
  },
})
