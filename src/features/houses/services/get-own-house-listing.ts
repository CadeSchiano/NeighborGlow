import { supabase } from '@/services/supabase/client';

export type HouseAvailabilityStatus = 'available' | 'finished' | 'not_started' | 'out' | 'running_low';

export type OwnHouseListing = {
  accessible: boolean;
  allergy_friendly: boolean;
  decorated: boolean;
  ends_at: string | null;
  haunted: boolean;
  id: string;
  latitude: number;
  longitude: number;
  non_candy: boolean;
  starts_at: string | null;
  status: HouseAvailabilityStatus;
};

export async function getOwnHouseListing(): Promise<OwnHouseListing | null> {
  const { data, error } = await supabase.rpc('get_my_house_listing');

  if (error) {
    throw error;
  }

  return (data?.[0] as OwnHouseListing | undefined) ?? null;
}
