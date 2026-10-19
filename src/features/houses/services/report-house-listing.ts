import { supabase } from '@/services/supabase/client';

export type ReportReason =
  | 'inappropriate_listing'
  | 'incorrect_location'
  | 'not_participating'
  | 'other'
  | 'unsafe_or_inappropriate';

export async function reportHouseListing(
  houseId: string,
  reporterId: string,
  reason: ReportReason,
  details: string
) {
  const { error } = await supabase.from('house_reports').insert({
    details: details.trim() || null,
    house_id: houseId,
    reason,
    reporter_id: reporterId,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already reported this listing. Thanks for helping keep the map accurate.');
    }

    throw error;
  }
}
