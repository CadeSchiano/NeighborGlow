import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HouseListingForm } from '@/features/houses/components/house-listing-form';
import { HouseAvailabilityControl } from '@/features/houses/components/house-availability-control';
import { CandyInventoryForm } from '@/features/houses/components/candy-inventory-form';
import {
  getOwnHouseListing,
  type OwnHouseListing,
} from '@/features/houses/services/get-own-house-listing';
import { useAuth } from '@/features/auth/providers/auth-provider';

export default function ListHouseScreen() {
  const { isLoading, session } = useAuth();
  const [existingListing, setExistingListing] = useState<OwnHouseListing | null>(null);
  const [isListingLoading, setIsListingLoading] = useState(true);
  const [listingError, setListingError] = useState('');
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isCurrent = true;

    const loadListing = async () => {
      setIsListingLoading(true);
      setListingError('');

      try {
        const listing = await getOwnHouseListing();

        if (isCurrent) {
          setExistingListing(listing);
        }
      } catch {
        if (isCurrent) {
          setListingError('We could not load your house listing. Please try again.');
        }
      } finally {
        if (isCurrent) {
          setIsListingLoading(false);
        }
      }
    };

    void loadListing();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#FFAA4D" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (isListingLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#FFAA4D" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Link accessibilityRole="link" href="/" style={styles.backLink}>
          ‹ Back to map
        </Link>
        <Text style={styles.eyebrow}>HOMEOWNER LISTING</Text>
        <Text style={styles.title}>{existingListing ? 'My Halloween house' : 'List your house'}</Text>
        {!existingListing ? (
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>It takes about two minutes.</Text>
            <Text style={styles.introText}>Choose your location, set your Halloween hours, then add the treats you plan to share.</Text>
            <View style={styles.stepRow}>
              <Text style={styles.stepActive}>1 Location</Text>
              <Text style={styles.step}>2 Details</Text>
              <Text style={styles.step}>3 Treats</Text>
            </View>
          </View>
        ) : null}
        {listingError ? <Text style={styles.errorMessage}>{listingError}</Text> : null}
        {!listingError ? (
          <>
            {existingListing ? (
              <>
                <HouseAvailabilityControl
                  houseId={existingListing.id}
                  initialStatus={existingListing.status}
                  ownerId={session.user.id}
                />
                <CandyInventoryForm houseId={existingListing.id} />
              </>
            ) : null}
            <HouseListingForm
              existingListing={existingListing}
              key={existingListing?.id ?? 'new-listing'}
              ownerId={session.user.id}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#15101F',
    flex: 1,
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#15101F',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  backLink: {
    color: '#D9B8FF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 30,
  },
  eyebrow: {
    color: '#FFAA4D',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#F8F4FC',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 6,
  },
  introCard: {
    backgroundColor: 'rgba(68, 39, 96, 0.5)',
    borderColor: 'rgba(178, 112, 255, 0.48)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginBottom: 20,
    padding: 16,
  },
  introTitle: {
    color: '#F8F4FC',
    fontSize: 17,
    fontWeight: '800',
  },
  introText: {
    color: '#D9CBE8',
    fontSize: 14,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  step: {
    color: '#BDAFCB',
    fontSize: 12,
    fontWeight: '700',
  },
  stepActive: {
    color: '#FFAA4D',
    fontSize: 12,
    fontWeight: '800',
  },
  errorMessage: {
    color: '#FFB4A3',
    fontSize: 15,
    lineHeight: 21,
  },
});
