import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';
import { Link, router } from 'expo-router';

import { useAuth } from '@/features/auth/providers/auth-provider';
import { PublicHouseDetailCard } from '@/features/houses/components/public-house-detail-card';
import {
  getHousesInBounds,
  type VisibleHouse,
} from '@/features/houses/services/get-houses-in-bounds';
import {
  getGlowInBounds,
  shouldShowGlow,
  type GlowArea,
} from '@/features/houses/services/get-glow-in-bounds';

const INITIAL_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 38,
  longitudeDelta: 38,
};

const GLOW_COLORS = {
  high: 'rgba(255, 170, 77, 0.34)',
  low: 'rgba(185, 120, 255, 0.18)',
  medium: 'rgba(217, 137, 255, 0.26)',
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const houseRequestIdRef = useRef(0);
  const houseRequestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glowRequestIdRef = useRef(0);
  const glowRequestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [glowAreas, setGlowAreas] = useState<GlowArea[]>([]);
  const [houses, setHouses] = useState<VisibleHouse[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingGlow, setIsLoadingGlow] = useState(false);
  const [isLoadingHouses, setIsLoadingHouses] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(
    'Use your location to center the map around you.'
  );
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const { isLoading: isLoadingAuth, session } = useAuth();

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

  useEffect(() => {
    return () => {
      if (houseRequestTimerRef.current) {
        clearTimeout(houseRequestTimerRef.current);
      }

      if (glowRequestTimerRef.current) {
        clearTimeout(glowRequestTimerRef.current);
      }
    };
  }, []);

  const loadHousesForRegion = useCallback((region: Region) => {
    houseRequestIdRef.current += 1;
    const requestId = houseRequestIdRef.current;

    if (houseRequestTimerRef.current) {
      clearTimeout(houseRequestTimerRef.current);
    }

    houseRequestTimerRef.current = setTimeout(() => {
      void (async () => {
        setIsLoadingHouses(true);

        try {
          const visibleHouses = await getHousesInBounds(region);

          if (houseRequestIdRef.current === requestId) {
            setHouses(visibleHouses);
          }
        } catch {
          if (houseRequestIdRef.current === requestId) {
            setHouses([]);
          }
        } finally {
          if (houseRequestIdRef.current === requestId) {
            setIsLoadingHouses(false);
          }
        }
      })();
    }, 250);
  }, []);

  const loadGlowForRegion = useCallback((nextRegion: Region) => {
    glowRequestIdRef.current += 1;
    const requestId = glowRequestIdRef.current;

    if (glowRequestTimerRef.current) {
      clearTimeout(glowRequestTimerRef.current);
    }

    if (!shouldShowGlow(nextRegion)) {
      setGlowAreas([]);
      setIsLoadingGlow(false);
      return;
    }

    glowRequestTimerRef.current = setTimeout(() => {
      void (async () => {
        setIsLoadingGlow(true);

        try {
          const visibleGlowAreas = await getGlowInBounds(nextRegion);

          if (glowRequestIdRef.current === requestId) {
            setGlowAreas(visibleGlowAreas);
          }
        } catch {
          if (glowRequestIdRef.current === requestId) {
            setGlowAreas([]);
          }
        } finally {
          if (glowRequestIdRef.current === requestId) {
            setIsLoadingGlow(false);
          }
        }
      })();
    }, 250);
  }, []);

  const handleRegionChangeComplete = useCallback(
    (nextRegion: Region) => {
      setRegion(nextRegion);
      loadHousesForRegion(nextRegion);
      loadGlowForRegion(nextRegion);
    },
    [loadGlowForRegion, loadHousesForRegion]
  );

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
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        onRegionChangeComplete={handleRegionChangeComplete}
        ref={mapRef}
        showsUserLocation={hasLocationPermission}
        style={styles.map}
        userInterfaceStyle="dark"
      >
        {shouldShowGlow(region)
          ? glowAreas.map((glowArea, index) => (
              <Circle
                center={{ latitude: glowArea.latitude, longitude: glowArea.longitude }}
                fillColor={GLOW_COLORS[glowArea.intensity]}
                key={`${glowArea.latitude}-${glowArea.longitude}-${index}`}
                radius={glowArea.radius_meters}
                strokeColor="rgba(255, 213, 143, 0.48)"
                strokeWidth={1}
              />
            ))
          : null}
        {!shouldShowGlow(region)
          ? houses.map((house) => (
              <Marker
                coordinate={{ latitude: house.latitude, longitude: house.longitude }}
                description={house.status === 'running_low' ? 'Candy running low' : 'Candy available'}
                key={house.id}
                onPress={() => setSelectedHouseId(house.id)}
                pinColor={house.status === 'running_low' ? '#FF9E3D' : '#B978FF'}
                title="Trick-or-treating"
              />
            ))
          : null}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View accessible accessibilityRole="header" style={styles.wordmark}>
          <Text style={styles.title}>NeighborGlow</Text>
          <Text style={styles.subtitle}>Halloween 2026</Text>
        </View>

        {!isLoadingAuth ? (
          <Link href="./sign-in" style={styles.accountLink}>
            {session ? 'Account' : 'Homeowner access'}
          </Link>
        ) : null}

        {shouldShowGlow(region) ? (
          <View accessible accessibilityRole="text" style={styles.glowLegend}>
            {isLoadingGlow ? <ActivityIndicator color="#FFAA4D" /> : null}
            <Text style={styles.glowLegendTitle}>The Glow</Text>
            <Text style={styles.glowLegendText}>Coarse neighborhood activity</Text>
          </View>
        ) : null}

        {selectedHouseId ? (
          <PublicHouseDetailCard
            houseId={selectedHouseId}
            onClose={() => setSelectedHouseId(null)}
            onSignIn={() => router.push('/sign-in')}
            userId={session?.user.id ?? null}
          />
        ) : null}

        <View style={[styles.locationControl, selectedHouseId ? styles.locationControlWithDetail : null]}>
          {isLoadingHouses ? <ActivityIndicator color="#FFAA4D" style={styles.houseLoading} /> : null}
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
    backgroundColor: 'rgba(24, 15, 36, 0.96)',
    borderColor: 'rgba(155, 97, 201, 0.58)',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 5,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
  },
  accountLink: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(24, 15, 36, 0.96)',
    borderColor: 'rgba(155, 97, 201, 0.58)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#F8F4FC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: -52,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  glowLegend: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(24, 15, 36, 0.96)',
    borderColor: 'rgba(255, 170, 77, 0.55)',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  glowLegendTitle: {
    color: '#FFAA4D',
    fontSize: 14,
    fontWeight: '700',
  },
  glowLegendText: {
    color: '#E9DDF5',
    fontSize: 12,
    marginTop: 2,
  },
  locationControl: {
    alignSelf: 'stretch',
    marginBottom: 16,
    marginTop: 'auto',
  },
  locationControlWithDetail: {
    marginTop: 12,
  },
  houseLoading: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  locationMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(24, 15, 36, 0.96)',
    borderColor: 'rgba(155, 97, 201, 0.42)',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F2EDF8',
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: '#FF9E3D',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  locationButtonPressed: {
    backgroundColor: '#E78328',
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
    color: '#FFAA4D',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#E9DDF5',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
