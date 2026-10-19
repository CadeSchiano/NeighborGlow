import { supabase } from '@/services/supabase/client';

export type PublicHouseDetails = {
  accessible: boolean;
  allergy_friendly: boolean;
  decorated: boolean;
  ends_at: string | null;
  haunted: boolean;
  id: string;
  non_candy: boolean;
  starts_at: string | null;
  status: 'available' | 'running_low';
};

export async function getPublicHouseDetails(houseId: string): Promise<PublicHouseDetails | null> {
  const { data, error } = await supabase.rpc('get_public_house_details', { p_house_id: houseId });

  if (error) {
    throw error;
  }

  return (data?.[0] as PublicHouseDetails | undefined) ?? null;
}
