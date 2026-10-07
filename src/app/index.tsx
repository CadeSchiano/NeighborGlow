import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { type Region } from 'react-native-maps';

const INITIAL_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 38,
  longitudeDelta: 38,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(
    'Use your location to center the map around you.'
  );

  useEffect(() => {
    let isMounted = true;

    const checkLocationPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (isMounted && status === 'granted') {
        setHasLocationPermission(true);
        setLocationMessage(null);
      }
    };

    void checkLocationPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  const centerOnCurrentLocation = async () => {
    setIsLocating(true);

    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        setLocationMessage(
          permission.canAskAgain
            ? 'Location access was not granted. You can still browse the map.'
            : 'Location access is off. You can still browse the map or enable it in Settings.'
        );
        return;
      }

      setHasLocationPermission(true);

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      mapRef.current?.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        500
      );
      setLocationMessage(null);
    } catch {
      setLocationMessage('We could not find your location. You can still browse the map.');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        accessibilityLabel="NeighborGlow map. Pan or zoom to explore the area."
        initialRegion={INITIAL_REGION}
        mapType="standard"
        ref={mapRef}
        showsUserLocation={hasLocationPermission}
        style={styles.map}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View accessible accessibilityRole="header" style={styles.wordmark}>
          <Text style={styles.title}>NeighborGlow</Text>
          <Text style={styles.subtitle}>Halloween 2026</Text>
        </View>

        <View style={styles.locationControl}>
          {locationMessage ? <Text style={styles.locationMessage}>{locationMessage}</Text> : null}
          <Pressable
            accessibilityHint="Requests permission, then centers the map on your current location."
            accessibilityLabel="Use my location"
            accessibilityRole="button"
            disabled={isLocating}
            onPress={centerOnCurrentLocation}
            style={({ pressed }) => [
              styles.locationButton,
              pressed && !isLocating ? styles.locationButtonPressed : null,
              isLocating ? styles.locationButtonDisabled : null,
            ]}
          >
            {isLocating ? <ActivityIndicator color="#15101F" /> : null}
            <Text
              style={[
                styles.locationButtonText,
                isLocating ? styles.locationButtonTextLoading : null,
              ]}
            >
              {isLocating ? 'Finding your location…' : 'Use my location'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 16,
  },
  wordmark: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(21, 16, 31, 0.92)',
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationControl: {
    alignSelf: 'stretch',
    marginBottom: 16,
    marginTop: 'auto',
  },
  locationMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(21, 16, 31, 0.92)',
    borderRadius: 10,
    color: '#F2EDF8',
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: '#F7A84A',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  locationButtonPressed: {
    backgroundColor: '#E8983C',
  },
  locationButtonDisabled: {
    opacity: 0.8,
  },
  locationButtonText: {
    color: '#15101F',
    fontSize: 16,
    fontWeight: '700',
  },
  locationButtonTextLoading: {
    marginLeft: 8,
  },
  title: {
    color: '#F7A84A',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#F2EDF8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
