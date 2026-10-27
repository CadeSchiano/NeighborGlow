import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import MapView, { Marker, type LatLng, type Region } from 'react-native-maps';

import { saveHouseListing } from '@/features/houses/services/create-house-listing';
import type { OwnHouseListing } from '@/features/houses/services/get-own-house-listing';
import { getHousePublishingConsentError } from '@/features/legal/legal-acknowledgments';

const INITIAL_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 38,
  longitudeDelta: 38,
};

function createTime(hours: number) {
  const time = new Date();
  time.setHours(hours, 0, 0, 0);
  return time;
}

function createTimeFromDatabase(value: string | null, fallbackHours: number) {
  if (!value) {
    return createTime(fallbackHours);
  }

  const [hours, minutes] = value.split(':').map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return createTime(fallbackHours);
  }

  const time = new Date();
  time.setHours(hours, minutes, 0, 0);
  return time;
}

function formatTimeForDatabase(time: Date) {
  return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:00`;
}

function formatTimeForDisplay(time: Date) {
  return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

type HouseListingFormProps = {
  existingListing: OwnHouseListing | null;
  ownerId: string;
};

export function HouseListingForm({ existingListing, ownerId }: HouseListingFormProps) {
  const mapRef = useRef<MapView>(null);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(
    existingListing
      ? { latitude: existingListing.latitude, longitude: existingListing.longitude }
      : null
  );
  const [startsAt, setStartsAt] = useState(() => createTimeFromDatabase(existingListing?.starts_at ?? null, 17));
  const [endsAt, setEndsAt] = useState(() => createTimeFromDatabase(existingListing?.ends_at ?? null, 20));
  const [decorated, setDecorated] = useState(existingListing?.decorated ?? false);
  const [haunted, setHaunted] = useState(existingListing?.haunted ?? false);
  const [accessible, setAccessible] = useState(existingListing?.accessible ?? false);
  const [allergyFriendly, setAllergyFriendly] = useState(existingListing?.allergy_friendly ?? false);
  const [nonCandy, setNonCandy] = useState(existingListing?.non_candy ?? false);
  const [isLocating, setIsLocating] = useState(false);
  const [isAdjustingLocation, setIsAdjustingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmsAtLeast18, setConfirmsAtLeast18] = useState(false);
  const [confirmsPublishingAuthorization, setConfirmsPublishingAuthorization] = useState(false);
  const [message, setMessage] = useState(() =>
    existingListing
      ? 'Update your Halloween listing below. Your pin is only public when you set availability.'
      : 'Tap the map to place your Halloween listing. You can drag the pin to adjust it.'
  );
  const [isSaved, setIsSaved] = useState(false);

  const selectCurrentLocation = async () => {
    setIsLocating(true);

    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        setMessage('Location access was not granted. You can still tap the map to choose your listing.');
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const location = { latitude: coords.latitude, longitude: coords.longitude };

      setSelectedLocation(location);
      mapRef.current?.animateToRegion(
        {
          ...location,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
      setIsAdjustingLocation(false);
      setMessage('Location selected. Choose Adjust pin only if you need to correct it.');
    } catch {
      setMessage('We could not find your location. You can still tap the map to choose your listing.');
    } finally {
      setIsLocating(false);
    }
  };

  const saveListing = async () => {
    if (!selectedLocation) {
      setMessage('Choose your listing location on the map before publishing.');
      return;
    }

    if (startsAt >= endsAt) {
      setMessage('Your end time must be later than your start time.');
      return;
    }

    if (!existingListing) {
      const consentError = getHousePublishingConsentError({
        confirmsAtLeast18,
        confirmsPublishingAuthorization,
      });

      if (consentError) {
        setMessage(consentError);
        return;
      }
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      await saveHouseListing({
        accessible,
        allergyFriendly,
        decorated,
        endsAt: formatTimeForDatabase(endsAt),
        haunted,
        houseId: existingListing?.id,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        nonCandy,
        ownerId,
        publishingConsent: existingListing
          ? undefined
          : { confirmsAtLeast18, confirmsPublishingAuthorization },
        startsAt: formatTimeForDatabase(startsAt),
      });
      setIsSaved(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not save your listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSaved) {
    return (
      <View style={styles.successCard}>
        <Text style={styles.eyebrow}>{existingListing ? 'LISTING UPDATED' : 'LISTING SAVED'}</Text>
        <Text style={styles.heading}>{existingListing ? 'Your changes are saved.' : 'Your house is set up.'}</Text>
        <Text style={styles.description}>
          It is saved as not started, so it is not visible on the public map yet. Availability is the next step.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryButtonPressed : null]}
        >
          <Text style={styles.primaryButtonText}>Back to map</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepLabel}>{existingListing ? 'YOUR LISTING' : 'STEP 1 OF 3'}</Text>
        <Text style={styles.stepTitle}>{existingListing ? 'Location and details' : 'Choose your house location'}</Text>
      </View>
      <Text style={styles.description}>{message}</Text>

      <MapView
        accessibilityLabel="Map for selecting your house listing location. Pin movement is enabled only while adjusting."
        initialRegion={
          selectedLocation
            ? { ...selectedLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : INITIAL_REGION
        }
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        onPress={(event) => {
          if (isAdjustingLocation) {
            setSelectedLocation(event.nativeEvent.coordinate);
          }
        }}
        ref={mapRef}
        style={styles.map}
        userInterfaceStyle="dark"
      >
        {selectedLocation ? (
          <Marker
            coordinate={selectedLocation}
            draggable={isAdjustingLocation}
            onDragEnd={(event) => {
              if (isAdjustingLocation) {
                setSelectedLocation(event.nativeEvent.coordinate);
              }
            }}
            pinColor="#B978FF"
            title="Your listing location"
          />
        ) : null}
      </MapView>

      <Pressable
        accessibilityHint="Uses your current location only to position the listing pin, which you can adjust before publishing."
        accessibilityLabel="Use my current location for listing"
        accessibilityRole="button"
        disabled={isLocating}
        onPress={() => void selectCurrentLocation()}
        style={({ pressed }) => [
          styles.locationButton,
          pressed && !isLocating ? styles.locationButtonPressed : null,
          isLocating ? styles.buttonDisabled : null,
        ]}
      >
        {isLocating ? <ActivityIndicator color="#F8F4FC" /> : null}
        <Text style={[styles.locationButtonText, isLocating ? styles.buttonTextLoading : null]}>
          {isLocating ? 'Finding your location…' : 'Use my location'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityLabel={isAdjustingLocation ? 'Finish adjusting listing pin' : 'Adjust listing pin'}
        accessibilityRole="button"
        onPress={() => {
          const nextIsAdjusting = !isAdjustingLocation;
          setIsAdjustingLocation(nextIsAdjusting);
          setMessage(
            nextIsAdjusting
              ? 'Adjustment mode is on. Tap the map or drag the pin, then choose Done adjusting.'
              : 'Pin adjustment is off. Your saved location will stay in place.'
          );
        }}
        style={({ pressed }) => [styles.adjustButton, pressed ? styles.locationButtonPressed : null]}
      >
        <Text style={styles.adjustButtonText}>
          {isAdjustingLocation ? 'Done adjusting' : selectedLocation ? 'Adjust pin' : 'Choose on map'}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>{existingListing ? 'Halloween hours' : 'Step 2 · Halloween hours'}</Text>
      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Text style={styles.label}>Starts</Text>
          <DateTimePicker
            display="compact"
            mode="time"
            onChange={(_event, selectedTime) => selectedTime && setStartsAt(selectedTime)}
            themeVariant="dark"
            value={startsAt}
          />
          <Text style={styles.timeValue}>{formatTimeForDisplay(startsAt)}</Text>
        </View>
        <View style={styles.timeField}>
          <Text style={styles.label}>Ends</Text>
          <DateTimePicker
            display="compact"
            mode="time"
            onChange={(_event, selectedTime) => selectedTime && setEndsAt(selectedTime)}
            themeVariant="dark"
            value={endsAt}
          />
          <Text style={styles.timeValue}>{formatTimeForDisplay(endsAt)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{existingListing ? 'House details' : 'Step 2 · House details'}</Text>
      <AttributeRow label="Decorated" value={decorated} onValueChange={setDecorated} />
      <AttributeRow label="Haunted" value={haunted} onValueChange={setHaunted} />
      <AttributeRow label="Accessible" value={accessible} onValueChange={setAccessible} />
      <AttributeRow
        label="Allergy-friendly options"
        value={allergyFriendly}
        onValueChange={setAllergyFriendly}
      />
      <AttributeRow label="Non-candy treats" value={nonCandy} onValueChange={setNonCandy} />

      {!existingListing ? (
        <View style={styles.consentCard}>
          <Text style={styles.consentTitle}>Before you publish</Text>
          <Text style={styles.consentDescription}>
            Your selected map coordinates, availability, hours, and selected house details will be publicly visible in NeighborGlow.
          </Text>
          <ConsentRow
            label="I am at least 18 years old."
            onValueChange={setConfirmsAtLeast18}
            value={confirmsAtLeast18}
          />
          <ConsentRow
            label="I am authorized to publish this residential location."
            onValueChange={setConfirmsPublishingAuthorization}
            value={confirmsPublishingAuthorization}
          />
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Save house listing"
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => void saveListing()}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && !isSubmitting ? styles.primaryButtonPressed : null,
          isSubmitting ? styles.buttonDisabled : null,
        ]}
      >
        {isSubmitting ? <ActivityIndicator color="#15101F" /> : null}
        <Text style={[styles.primaryButtonText, isSubmitting ? styles.buttonTextLoading : null]}>
          {isSubmitting ? 'Saving listing…' : existingListing ? 'Save changes' : 'Save house listing'}
        </Text>
      </Pressable>
    </View>
  );
}

type AttributeRowProps = {
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

function AttributeRow({ label, onValueChange, value }: AttributeRowProps) {
  return (
    <View style={styles.attributeRow}>
      <Text style={styles.attributeLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        onValueChange={onValueChange}
        thumbColor={value ? '#FFAA4D' : '#E9DDF5'}
        trackColor={{ false: '#5D526B', true: '#8E5BC0' }}
        value={value}
      />
    </View>
  );
}

function ConsentRow({ label, onValueChange, value }: AttributeRowProps) {
  return (
    <View style={styles.consentRow}>
      <Text style={styles.consentLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        accessibilityRole="switch"
        onValueChange={onValueChange}
        thumbColor={value ? '#FFAA4D' : '#E9DDF5'}
        trackColor={{ false: '#5D526B', true: '#8E5BC0' }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  stepHeader: {
    gap: 4,
    marginBottom: 2,
  },
  stepLabel: {
    color: '#B978FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  stepTitle: {
    color: '#F8F4FC',
    fontSize: 21,
    fontWeight: '800',
  },
  successCard: {
    backgroundColor: 'rgba(24, 15, 36, 0.97)',
    borderColor: 'rgba(155, 97, 201, 0.58)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 22,
  },
  eyebrow: {
    color: '#FFAA4D',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heading: {
    color: '#F8F4FC',
    fontSize: 28,
    fontWeight: '700',
  },
  description: {
    color: '#E9DDF5',
    fontSize: 15,
    lineHeight: 21,
  },
  map: {
    borderColor: 'rgba(155, 97, 201, 0.58)',
    borderRadius: 16,
    borderWidth: 1,
    height: 280,
    overflow: 'hidden',
  },
  locationButton: {
    alignItems: 'center',
    borderColor: '#D9B8FF',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  locationButtonPressed: {
    backgroundColor: 'rgba(217, 184, 255, 0.16)',
  },
  locationButtonText: {
    color: '#F8F4FC',
    fontSize: 16,
    fontWeight: '700',
  },
  adjustButton: {
    alignItems: 'center',
    borderColor: '#D9B8FF',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  adjustButtonText: {
    color: '#D9B8FF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#FFAA4D',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeField: {
    backgroundColor: '#342345',
    borderColor: 'rgba(202, 172, 230, 0.58)',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  label: {
    color: '#F8F4FC',
    fontSize: 14,
    fontWeight: '600',
  },
  timeValue: {
    color: '#E9DDF5',
    fontSize: 14,
    marginTop: 4,
  },
  attributeRow: {
    alignItems: 'center',
    backgroundColor: '#342345',
    borderColor: 'rgba(202, 172, 230, 0.38)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 14,
  },
  attributeLabel: {
    color: '#F8F4FC',
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingRight: 12,
  },
  consentCard: {
    backgroundColor: 'rgba(78, 50, 107, 0.26)',
    borderColor: 'rgba(217, 184, 255, 0.38)',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 10,
    padding: 14,
  },
  consentTitle: {
    color: '#FFAA4D',
    fontSize: 16,
    fontWeight: '800',
  },
  consentDescription: {
    color: '#E9DDF5',
    fontSize: 14,
    lineHeight: 20,
  },
  consentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  consentLabel: {
    color: '#F8F4FC',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#FF9E3D',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonPressed: {
    backgroundColor: '#E78328',
  },
  primaryButtonText: {
    color: '#15101F',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  buttonTextLoading: {
    marginLeft: 8,
  },
});
