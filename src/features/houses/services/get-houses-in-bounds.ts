import { supabase } from '@/services/supabase/client';

import { getMapBounds, type MapBounds, type MapRegion } from './map-query-bounds';

const MAXIMUM_VIEWPORT_DELTA = 0.25;

export type { MapRegion } from './map-query-bounds';

export type VisibleHouse = {
  id: string;
  latitude: number;
  longitude: number;
  status: 'available' | 'running_low';
};

export function getHouseBounds(region: MapRegion): MapBounds | null {
  return getMapBounds(region, MAXIMUM_VIEWPORT_DELTA);
}

export async function getHousesInBounds(region: MapRegion): Promise<VisibleHouse[]> {
  const bounds = getHouseBounds(region);

  if (!bounds) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_houses_in_bounds', bounds);

  if (error) {
    throw error;
  }

  return (data ?? []) as VisibleHouse[];
}
