import { supabase } from '@/services/supabase/client';

import { getHousePublishingConsentError, type HousePublishingConsent } from '@/features/legal/legal-acknowledgments';

import { hasValidHouseCoordinates } from './house-listing-validation';

type SaveHouseListingInput = {
  accessible: boolean;
  allergyFriendly: boolean;
  decorated: boolean;
  endsAt: string;
  haunted: boolean;
  latitude: number;
  longitude: number;
  nonCandy: boolean;
  houseId?: string;
  ownerId: string;
  publishingConsent?: HousePublishingConsent;
  startsAt: string;
};

export async function saveHouseListing({
  accessible,
  allergyFriendly,
  decorated,
  endsAt,
  haunted,
  latitude,
  longitude,
  nonCandy,
  houseId,
  ownerId,
  publishingConsent,
  startsAt,
}: SaveHouseListingInput) {
  if (!hasValidHouseCoordinates(latitude, longitude)) {
    throw new Error('Choose a valid location on the map.');
  }

  if (!houseId) {
    const consentError = getHousePublishingConsentError(
      publishingConsent ?? {
        confirmsAtLeast18: false,
        confirmsPublishingAuthorization: false,
      },
    );

    if (consentError) {
      throw new Error(consentError);
    }
  }

  const values = {
    accessible,
    allergy_friendly: allergyFriendly,
    decorated,
    ends_at: endsAt,
    haunted,
    location: `POINT(${longitude} ${latitude})`,
    non_candy: nonCandy,
    owner_id: ownerId,
    starts_at: startsAt,
  };

  const { error } = houseId
    ? await supabase.from('houses').update(values).eq('id', houseId).eq('owner_id', ownerId)
    : await supabase.from('houses').insert(values);

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already have a house listing. Return to it to make changes.');
    }

    throw error;
  }
}
