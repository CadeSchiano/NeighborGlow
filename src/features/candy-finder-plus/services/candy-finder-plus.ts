import { supabase } from '@/services/supabase/client';

import { getHouseBounds, type MapRegion, type VisibleHouse } from '@/features/houses/services/get-houses-in-bounds';

export type CandyFinderPlusStatus = {
  expires_at: string | null;
  is_active: boolean;
};

export type PremiumHouseCandy = {
  name: string;
  size: 'full_size' | 'fun_size' | 'mixed';
};

export async function getCandyFinderPlusStatus(): Promise<CandyFinderPlusStatus> {
  const { data, error } = await supabase.rpc('get_my_candy_finder_plus_status');

  if (error) {
    throw error;
  }

  return (data?.[0] as CandyFinderPlusStatus | undefined) ?? { expires_at: null, is_active: false };
}

export async function getPremiumHousesInBounds(
  region: MapRegion,
  fullSizeOnly: boolean,
): Promise<VisibleHouse[]> {
  const bounds = getHouseBounds(region);

  if (!bounds) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_candy_finder_plus_houses_in_bounds', {
    ...bounds,
    p_full_size_only: fullSizeOnly,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as VisibleHouse[];
}

export async function getPremiumHouseCandy(houseId: string): Promise<PremiumHouseCandy[]> {
  const { data, error } = await supabase.rpc('get_candy_finder_plus_house_candy', {
    p_house_id: houseId,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as PremiumHouseCandy[];
}
