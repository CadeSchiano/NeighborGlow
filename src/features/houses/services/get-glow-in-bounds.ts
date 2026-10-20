import { supabase } from '@/services/supabase/client';

import {
  getMapBounds,
  shouldAutomaticallyShowGlow,
  type MapBounds,
  type MapRegion,
} from './map-query-bounds';

const MAXIMUM_GLOW_VIEWPORT_DELTA = 40;

export type GlowArea = {
  cell_size_degrees: number;
  intensity: 'high' | 'low' | 'medium' | 'very_high';
  latitude: number;
  longitude: number;
  radius_meters: number;
};

export function getGlowBounds(region: MapRegion): MapBounds | null {
  return getMapBounds(region, MAXIMUM_GLOW_VIEWPORT_DELTA);
}

export function shouldShowGlow(region: MapRegion) {
  return shouldAutomaticallyShowGlow(region);
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
