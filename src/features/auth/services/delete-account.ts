import { syncRevenueCatUser } from '@/features/candy-finder-plus/services/revenuecat';
import { supabase } from '@/services/supabase/client';
import { completeCurrentAccountDeletion, type AccountDeletionResult } from './account-deletion-state';

export type { AccountDeletionResult } from './account-deletion-state';

export async function deleteCurrentAccount(expectedUserId: string): Promise<AccountDeletionResult> {
  return completeCurrentAccountDeletion(expectedUserId, {
    getSession: async () => (await supabase.auth.getSession()).data.session,
    requestDeletion: async (accessToken) => {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error || data?.deleted !== true) throw new Error('Account deletion could not be completed.');
    },
    clearRevenueCatIdentity: () => syncRevenueCatUser(null),
    signOutLocally: async () => {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
  });
}
