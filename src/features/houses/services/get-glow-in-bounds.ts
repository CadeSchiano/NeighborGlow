import { supabase } from '@/services/supabase/client';

import type { MapRegion } from './get-houses-in-bounds';

const INDIVIDUAL_HOUSE_VIEWPORT_DELTA = 0.25;
const MAXIMUM_GLOW_VIEWPORT_DELTA = 40;

export type GlowArea = {
  intensity: 'high' | 'low' | 'medium';
  latitude: number;
  longitude: number;
  radius_meters: number;
};

type GlowBounds = {
  max_lat: number;
  max_lng: number;
  min_lat: number;
  min_lng: number;
};

function getGlowBounds(region: MapRegion): GlowBounds | null {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitudeDelta) ||
    !Number.isFinite(longitudeDelta) ||
    (latitudeDelta <= INDIVIDUAL_HOUSE_VIEWPORT_DELTA &&
      longitudeDelta <= INDIVIDUAL_HOUSE_VIEWPORT_DELTA) ||
    latitudeDelta > MAXIMUM_GLOW_VIEWPORT_DELTA ||
    longitudeDelta > MAXIMUM_GLOW_VIEWPORT_DELTA
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

export function shouldShowGlow(region: MapRegion) {
  return (
    region.latitudeDelta > INDIVIDUAL_HOUSE_VIEWPORT_DELTA ||
    region.longitudeDelta > INDIVIDUAL_HOUSE_VIEWPORT_DELTA
  );
}

export async function getGlowInBounds(region: MapRegion): Promise<GlowArea[]> {
  const bounds = getGlowBounds(region);

  if (!bounds) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_glow_in_bounds', bounds);

  if (error) {
    throw error;
  }

  return (data ?? []) as GlowArea[];
}
