export type RevenueCatDeletionResult = {
  ok: boolean;
  status: number;
};

type AccountDeletionDependencies = {
  deleteRevenueCatCustomer: (userId: string) => Promise<RevenueCatDeletionResult>;
  deleteSupabaseUser: (userId: string) => Promise<void>;
};

/**
 * Deletes the external RevenueCat customer before the Supabase Auth user. If
 * RevenueCat is temporarily unavailable, the Auth user is intentionally left
 * intact so the same authenticated user can retry without an incomplete erase.
 */
export async function deleteAuthenticatedAccount(
  userId: string,
  { deleteRevenueCatCustomer, deleteSupabaseUser }: AccountDeletionDependencies,
) {
  const revenueCatResult = await deleteRevenueCatCustomer(userId);

  // RevenueCat documents both 200 and 404 as successful "ensure deleted"
  // outcomes. A previous attempt may have already queued customer removal.
  if (!revenueCatResult.ok) {
    throw new Error('RevenueCat customer deletion could not be confirmed.');
  }

  // Deleting auth.users executes the existing foreign-key cascades for this
  // user’s profile, listing, contributions, entitlement, and webhook events.
  await deleteSupabaseUser(userId);
}
