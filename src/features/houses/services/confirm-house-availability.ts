import { supabase } from '@/services/supabase/client';

export type ConfirmationStatus = 'available' | 'out' | 'running_low';

export async function confirmHouseAvailability(
  houseId: string,
  userId: string,
  status: ConfirmationStatus
) {
  const { error } = await supabase.from('house_confirmations').upsert(
    {
      house_id: houseId,
      status,
      user_id: userId,
    },
    { onConflict: 'house_id,user_id' }
  );

  if (error) {
    throw error;
  }
}
