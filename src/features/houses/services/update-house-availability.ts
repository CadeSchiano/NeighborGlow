import { supabase } from '@/services/supabase/client';

import type { HouseAvailabilityStatus } from './get-own-house-listing';

type UpdateHouseAvailabilityInput = {
  houseId: string;
  ownerId: string;
  status: HouseAvailabilityStatus;
};

export async function updateHouseAvailability({
  houseId,
  ownerId,
  status,
}: UpdateHouseAvailabilityInput) {
  const { error } = await supabase
    .from('houses')
    .update({ status })
    .eq('id', houseId)
    .eq('owner_id', ownerId);

  if (error) {
    throw error;
  }
}
