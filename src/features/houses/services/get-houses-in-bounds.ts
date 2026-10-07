import { supabase } from '@/services/supabase/client';

const MAXIMUM_VIEWPORT_DELTA = 0.25;

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type VisibleHouse = {
  id: string;
  latitude: number;
  longitude: number;
  status: 'available' | 'running_low';
};

type HouseBounds = {
  min_lat: number;
  min_lng: number;
  max_lat: number;
  max_lng: number;
};

function getHouseBounds(region: MapRegion): HouseBounds | null {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitudeDelta) ||
    !Number.isFinite(longitudeDelta) ||
    latitudeDelta <= 0 ||
    longitudeDelta <= 0 ||
    latitudeDelta > MAXIMUM_VIEWPORT_DELTA ||
    longitudeDelta > MAXIMUM_VIEWPORT_DELTA
  ) {
    return null;
  }

  const min_lat = latitude - latitudeDelta / 2;
  const max_lat = latitude + latitudeDelta / 2;
  const min_lng = longitude - longitudeDelta / 2;
  const max_lng = longitude + longitudeDelta / 2;

  if (min_lat < -90 || max_lat > 90 || min_lng < -180 || max_lng > 180) {
    return null;
  }

  return { min_lat, min_lng, max_lat, max_lng };
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
