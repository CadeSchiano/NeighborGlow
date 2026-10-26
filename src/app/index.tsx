import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polygon, type Region } from 'react-native-maps';
import { Link, router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/features/auth/providers/auth-provider';
import { WelcomeFlow } from '@/features/onboarding/components/welcome-flow';
import { PublicHouseDetailCard } from '@/features/houses/components/public-house-detail-card';
import { HalloweenHouseMarker } from '@/features/houses/components/halloween-house-marker';
import { getOwnHouseListing } from '@/features/houses/services/get-own-house-listing';
import {
  getHousesInBounds,
  type VisibleHouse,
} from '@/features/houses/services/get-houses-in-bounds';
import {
  getGlowInBounds,
  shouldShowGlow,
  type GlowArea,
} from '@/features/houses/services/get-glow-in-bounds';
import { getCandyFinderPlusStatus, getPremiumHousesInBounds } from '@/features/candy-finder-plus/services/candy-finder-plus';

const INITIAL_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 38,
  longitudeDelta: 38,
};

const ONBOARDING_STORAGE_KEY = 'neighborglow-onboarding-complete';

const GLOW_COLORS = {
  high: 'rgba(255, 151, 61, 0.38)',
  low: 'rgba(82, 178, 255, 0.22)',
  medium: 'rgba(255, 222, 79, 0.33)',
  very_high: 'rgba(231, 76, 60, 0.42)',
};

function getGlowCellCoordinates(glowArea: GlowArea) {
  const halfCellSize = glowArea.cell_size_degrees / 2;

  return [
    { latitude: glowArea.latitude - halfCellSize, longitude: glowArea.longitude - halfCellSize },
    { latitude: glowArea.latitude - halfCellSize, longitude: glowArea.longitude + halfCellSize },
    { latitude: glowArea.latitude + halfCellSize, longitude: glowArea.longitude + halfCellSize },
    { latitude: glowArea.latitude + halfCellSize, longitude: glowArea.longitude - halfCellSize },
  ];
}

export default function MapScreen() {
  const { premium } = useLocalSearchParams<{ premium?: string }>();
  const mapRef = useRef<MapView>(null);
  const houseRequestIdRef = useRef(0);
  const houseRequestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glowRequestIdRef = useRef(0);
  const glowRequestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(true);
  const [isHeatmapEnabled, setIsHeatmapEnabled] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [isFullSizeOnly, setIsFullSizeOnly] = useState(false);
  const [premiumCandyName, setPremiumCandyName] = useState('');
  const [hasCandyFinderPass, setHasCandyFinderPass] = useState(false);
  const [candyFinderPassUserId, setCandyFinderPassUserId] = useState<string | null>(null);
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
  const [ownHouseId, setOwnHouseId] = useState<string | null>(null);
  const { isLoading: isLoadingAuth, session } = useAuth();
  const insets = useSafeAreaInsets();
  const userId = session?.user.id;
  const isPremiumMap = premium === '1' && Boolean(userId) && hasCandyFinderPass && candyFinderPassUserId === userId;
  const showHeatmap = isHeatmapEnabled || shouldShowGlow(region);

  useEffect(() => {
    let isMounted = true;

    const checkLocationPermission = async () => {
      const [{ status }, onboardingComplete] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
      ]);

      if (isMounted && status === 'granted') {
        setHasLocationPermission(true);
        setLocationMessage(null);
      }

      if (isMounted && onboardingComplete === 'true') {
        setIsOnboardingVisible(false);
      }
    };

    void checkLocationPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isCurrent = true;

    const loadOwnHouse = async () => {
      try {
        const ownHouse = await getOwnHouseListing();

        if (isCurrent) {
          setOwnHouseId(ownHouse?.id ?? null);
        }
      } catch {
        if (isCurrent) {
          setOwnHouseId(null);
        }
      }
    };

    void loadOwnHouse();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => {
      void getCandyFinderPlusStatus()
        .then((status) => {
          setHasCandyFinderPass(status.is_active);
          setCandyFinderPassUserId(userId);
        })
        .catch(() => {
          setHasCandyFinderPass(false);
          setCandyFinderPassUserId(userId);
        });
    }, 0);
    return () => clearTimeout(timer);
  }, [userId]);

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
          const visibleHouses = isPremiumMap
            ? await getPremiumHousesInBounds(region, isFullSizeOnly, premiumCandyName.trim() ? [premiumCandyName.trim()] : [])
            : await getHousesInBounds(region);

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
  }, [isFullSizeOnly, isPremiumMap, premiumCandyName]);

  const loadGlowForRegion = useCallback((nextRegion: Region) => {
    glowRequestIdRef.current += 1;
    const requestId = glowRequestIdRef.current;

    if (glowRequestTimerRef.current) {
      clearTimeout(glowRequestTimerRef.current);
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
    },
    []
  );

  useEffect(() => {
    loadHousesForRegion(region);
    loadGlowForRegion(region);
  }, [loadGlowForRegion, loadHousesForRegion, region]);

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

  const completeOnboarding = () => {
    setIsOnboardingVisible(false);
    void AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
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
        {showHeatmap
          ? glowAreas.map((glowArea, index) => (
              <Polygon
                coordinates={getGlowCellCoordinates(glowArea)}
                fillColor={GLOW_COLORS[glowArea.intensity]}
                key={`${glowArea.latitude}-${glowArea.longitude}-${index}`}
                strokeColor="rgba(255, 255, 255, 0)"
                strokeWidth={0}
              />
            ))
          : null}
        {!showHeatmap
          ? houses.map((house) => (
              <HalloweenHouseMarker
                house={house}
                key={house.id}
                onPress={() => setSelectedHouseId(house.id)}
              />
            ))
          : null}
      </MapView>

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.topBar}>
          <View accessible accessibilityRole="header" style={styles.wordmark}>
            <Text style={styles.title}>Neighbor<Text style={styles.titleAccent}>Glow</Text></Text>
            <Text style={styles.subtitle}>Halloween 2026</Text>
          </View>
          {!isLoadingAuth ? (
            <Link href="./sign-in" style={styles.accountLink}>
              {session ? 'Account' : 'Sign in'}
            </Link>
          ) : null}
        </View>

        <View style={styles.topControls}>
          <Pressable
            accessibilityLabel={isHeatmapEnabled ? 'Turn off heatmap mode' : 'Turn on heatmap mode'}
            accessibilityRole="button"
            onPress={() => setIsHeatmapEnabled((currentValue) => !currentValue)}
            style={({ pressed }) => [styles.controlChip, styles.glowControlChip, pressed ? styles.heatmapButtonPressed : null]}
          >
            <Text style={styles.heatmapButtonText}>{isHeatmapEnabled ? 'Houses' : 'The Glow'}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Learn about Candy Finder Plus"
            accessibilityRole="button"
            onPress={() => router.push('./candy-finder-plus')}
            style={({ pressed }) => [styles.controlChip, styles.premiumFilterButton, pressed ? styles.heatmapButtonPressed : null]}
          >
            <Text style={styles.premiumFilterButtonText}>✦ Finder+</Text>
          </Pressable>
        </View>

        {showHeatmap ? (
          <View accessible accessibilityRole="text" style={styles.glowLegend}>
            {isLoadingGlow ? <ActivityIndicator color="#FFAA4D" /> : null}
            <Text style={styles.glowLegendTitle}>The Glow</Text>
            <Text style={styles.glowLegendText}>Coarse neighborhood activity</Text>
          </View>
        ) : null}
        {!showHeatmap && houses.length > 0 ? (
          <Pressable
            accessibilityLabel="House marker legend"
            accessibilityRole="button"
            accessibilityState={{ expanded: isLegendExpanded }}
            onPress={() => setIsLegendExpanded((current) => !current)}
            style={({ pressed }) => [styles.houseLegend, pressed ? styles.heatmapButtonPressed : null]}
          >
            <Text style={styles.houseLegendTitle}>Marker guide {isLegendExpanded ? '⌃' : '⌄'}</Text>
            {isLegendExpanded ? <Text style={styles.houseLegendText}>🎃 Decorated{`\n`}👻 Haunted{`\n`}🍬 Allergy-friendly{`\n`}♿ Accessible</Text> : null}
          </Pressable>
        ) : null}

        {selectedHouseId ? (
          <PublicHouseDetailCard
            houseId={selectedHouseId}
            isPremium={hasCandyFinderPass}
            isOwner={ownHouseId === selectedHouseId && Boolean(userId)}
            onClose={() => setSelectedHouseId(null)}
            onCandyFinderPlus={() => router.push('./candy-finder-plus')}
            onEdit={() => router.push('/list-house')}
            onSignIn={() => router.push('/sign-in')}
            userId={userId ?? null}
          />
        ) : null}

        <View style={[styles.locationControl, selectedHouseId ? styles.locationControlWithDetail : null]}>
          {isLoadingHouses ? <ActivityIndicator color="#FFAA4D" style={styles.houseLoading} /> : null}
          {locationMessage ? <Text style={styles.locationMessage}>{locationMessage}</Text> : null}
          <View style={styles.mapActions}>
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
              {isLocating ? <ActivityIndicator color="#1A1023" /> : null}
              <Text style={[styles.locationButtonText, isLocating ? styles.locationButtonTextLoading : null]}>
                {isLocating ? 'Finding…' : '⌁  My location'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Open map filters"
              accessibilityRole="button"
              onPress={() => setIsFiltersVisible(true)}
              style={({ pressed }) => [styles.filtersButton, pressed ? styles.heatmapButtonPressed : null]}
            >
              <Text style={styles.filtersButtonText}>☷ Filters{isPremiumMap && (isFullSizeOnly || premiumCandyName.trim()) ? ' •' : ''}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Open my profile"
              accessibilityRole="button"
              onPress={() => router.push('./profile')}
              style={({ pressed }) => [styles.profileButton, pressed ? styles.heatmapButtonPressed : null]}
            >
              <Text style={styles.profileButtonText}>◯</Text>
            </Pressable>
          </View>
          <View style={styles.bottomNav}>
            <View style={styles.navItem}><Text style={styles.navIcon}>⌖</Text><Text style={styles.navLabelActive}>Map</Text></View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/list-house')} style={styles.navItem}>
              <Text style={styles.navIcon}>⌂</Text><Text style={styles.navLabel}>My house</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push('./profile')} style={styles.navItem}>
              <Text style={styles.navIcon}>◯</Text><Text style={styles.navLabel}>Profile</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
      <Modal
        animationType="slide"
        onRequestClose={() => setIsFiltersVisible(false)}
        transparent
        visible={isFiltersVisible}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
          <Pressable accessibilityLabel="Close filters" onPress={() => setIsFiltersVisible(false)} style={styles.modalBackdrop} />
          <View accessibilityViewIsModal style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>MAP CONTROLS</Text>
                <Text style={styles.sheetTitle}>Filters</Text>
              </View>
              <Pressable accessibilityLabel="Close filters" accessibilityRole="button" onPress={() => setIsFiltersVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            {isPremiumMap ? (
              <>
                <Text style={styles.sheetDescription}>Find participating homes with premium candy details.</Text>
                <Pressable accessibilityRole="switch" accessibilityState={{ checked: isFullSizeOnly }} onPress={() => setIsFullSizeOnly((current) => !current)} style={styles.fullSizeRow}>
                  <View>
                    <Text style={styles.fullSizeTitle}>Full-size candy</Text>
                    <Text style={styles.fullSizeDescription}>Show homes with full-size treats</Text>
                  </View>
                  <View style={[styles.toggleTrack, isFullSizeOnly ? styles.toggleTrackActive : null]}><View style={[styles.toggleKnob, isFullSizeOnly ? styles.toggleKnobActive : null]} /></View>
                </Pressable>
                <Text style={styles.inputLabel}>Candy name</Text>
                <TextInput
                  accessibilityLabel="Filter by exact candy name"
                  autoCapitalize="words"
                  autoCorrect={false}
                  onChangeText={setPremiumCandyName}
                  placeholder="e.g. Reese's"
                  placeholderTextColor="#BDAFCB"
                  style={styles.candyFilterInput}
                  value={premiumCandyName}
                />
              </>
            ) : (
              <View style={styles.lockedFilters}>
                <Text style={styles.lockedFiltersTitle}>✦ Candy Finder+ filters</Text>
                <Text style={styles.lockedFiltersText}>Full-size and candy-name filters are included with the 2026 Halloween Pass. You can keep browsing every participating house for free.</Text>
                <Pressable accessibilityRole="button" onPress={() => { setIsFiltersVisible(false); router.push('./candy-finder-plus'); }} style={styles.learnMoreButton}>
                  <Text style={styles.learnMoreButtonText}>Explore Candy Finder+</Text>
                </Pressable>
              </View>
            )}
            <Pressable accessibilityRole="button" onPress={() => setIsFiltersVisible(false)} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {isOnboardingVisible ? (
        <WelcomeFlow
          isRequestingLocation={isLocating}
          onAllowLocation={centerOnCurrentLocation}
          onComplete={completeOnboarding}
        />
      ) : null}
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
  topBar: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  wordmark: {
    backgroundColor: 'rgba(24, 15, 36, 0.96)',
    borderColor: 'rgba(155, 97, 201, 0.58)',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
  },
  accountLink: {
    backgroundColor: 'rgba(24, 15, 36, 0.96)',
    borderColor: 'rgba(155, 97, 201, 0.58)',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F8F4FC',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  topControls: { alignSelf: 'flex-end', flexDirection: 'row', gap: 8, marginTop: 9 },
  controlChip: {
    backgroundColor: 'rgba(24, 15, 36, 0.96)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  glowControlChip: { borderColor: 'rgba(82, 178, 255, 0.6)' },
  premiumFilterButton: {
    backgroundColor: 'rgba(50, 35, 70, 0.92)',
    borderColor: '#8E5DCC',
  },
  premiumFilterButtonText: {
    color: '#EEDFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  heatmapButtonPressed: {
    opacity: 0.75,
  },
  heatmapButtonText: {
    color: '#B9E1FF',
    fontSize: 13,
    fontWeight: '700',
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
  houseLegend: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(24, 15, 36, 0.94)',
    borderColor: 'rgba(255, 170, 77, 0.42)',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  houseLegendTitle: { color: '#FFAA4D', fontSize: 12, fontWeight: '800' },
  houseLegendText: { color: '#E9DDF5', fontSize: 11, lineHeight: 18, marginTop: 2 },
  locationControl: {
    alignSelf: 'stretch',
    marginTop: 'auto',
  },
  locationControlWithDetail: {
    marginTop: 12,
  },
  mapActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  filtersButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(38, 22, 60, 0.97)',
    borderColor: '#A96EE8',
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  filtersButtonText: { color: '#EEDFFF', fontSize: 13, fontWeight: '800' },
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
    flex: 1,
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
  profileButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(24, 15, 36, 0.96)',
    borderColor: 'rgba(217, 184, 255, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  profileButtonText: { color: '#E9D3FF', fontSize: 22, fontWeight: '700' },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: 'rgba(19, 12, 30, 0.97)',
    borderColor: 'rgba(178, 112, 255, 0.36)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingVertical: 8,
  },
  navItem: { alignItems: 'center', minWidth: 72, paddingVertical: 2 },
  navIcon: { color: '#CDBFDD', fontSize: 19 },
  navLabel: { color: '#CDBFDD', fontSize: 11, fontWeight: '700', marginTop: 2 },
  navLabelActive: { color: '#FFAA4D', fontSize: 11, fontWeight: '800', marginTop: 2 },
  title: {
    color: '#F8F4FC',
    fontSize: 20,
    fontWeight: '700',
  },
  titleAccent: { color: '#FF9E3D' },
  subtitle: {
    color: '#E9DDF5',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(7, 4, 12, 0.56)' },
  filterSheet: {
    backgroundColor: '#1C122A',
    borderColor: 'rgba(178, 112, 255, 0.58)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: { alignSelf: 'center', backgroundColor: 'rgba(233, 211, 255, 0.42)', borderRadius: 999, height: 4, width: 40 },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sheetEyebrow: { color: '#FFAA4D', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  sheetTitle: { color: '#F8F4FC', fontSize: 24, fontWeight: '800', marginTop: 2 },
  closeButton: { alignItems: 'center', backgroundColor: '#322043', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  closeButtonText: { color: '#F8F4FC', fontSize: 25, fontWeight: '300', lineHeight: 29 },
  sheetDescription: { color: '#D9CBE8', fontSize: 14, lineHeight: 20 },
  fullSizeRow: { alignItems: 'center', backgroundColor: 'rgba(63, 38, 84, 0.72)', borderColor: 'rgba(217, 184, 255, 0.28)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  fullSizeTitle: { color: '#F8F4FC', fontSize: 16, fontWeight: '800' },
  fullSizeDescription: { color: '#CDBFDD', fontSize: 12, marginTop: 3 },
  toggleTrack: { backgroundColor: '#4A3B58', borderRadius: 20, height: 28, justifyContent: 'center', padding: 3, width: 50 },
  toggleTrackActive: { backgroundColor: '#8E5DCC', alignItems: 'flex-end' },
  toggleKnob: { backgroundColor: '#F8F4FC', borderRadius: 11, height: 22, width: 22 },
  toggleKnobActive: { backgroundColor: '#FFF2DD' },
  inputLabel: { color: '#E9D3FF', fontSize: 13, fontWeight: '800', marginBottom: -7 },
  candyFilterInput: { backgroundColor: '#21152F', borderColor: 'rgba(217, 184, 255, 0.35)', borderRadius: 12, borderWidth: 1, color: '#F8F4FC', fontSize: 16, paddingHorizontal: 13, paddingVertical: 12 },
  lockedFilters: { backgroundColor: 'rgba(63, 38, 84, 0.58)', borderColor: 'rgba(217, 184, 255, 0.28)', borderRadius: 16, borderWidth: 1, gap: 9, padding: 16 },
  lockedFiltersTitle: { color: '#EEDFFF', fontSize: 16, fontWeight: '800' },
  lockedFiltersText: { color: '#D9CBE8', fontSize: 14, lineHeight: 20 },
  learnMoreButton: { alignSelf: 'flex-start', backgroundColor: '#5D3B81', borderRadius: 12, marginTop: 3, paddingHorizontal: 13, paddingVertical: 10 },
  learnMoreButtonText: { color: '#F8F4FC', fontSize: 13, fontWeight: '800' },
  doneButton: { alignItems: 'center', backgroundColor: '#FF9E3D', borderRadius: 14, justifyContent: 'center', minHeight: 48 },
  doneButtonText: { color: '#1A1023', fontSize: 16, fontWeight: '800' },
});
