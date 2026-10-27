import type { Session } from '@supabase/supabase-js';

export type AccountDeletionResult = {
  didClearCurrentSession: boolean;
};

export type AccountDeletionDependencies = {
  getSession: () => Promise<Session | null>;
  requestDeletion: (accessToken: string) => Promise<void>;
  clearRevenueCatIdentity: () => Promise<boolean>;
  signOutLocally: () => Promise<void>;
};

export class AccountDeletionCleanupError extends Error {
  constructor() {
    super('The account was deleted, but this device could not finish signing out.');
  }
}

export class AccountDeletionSessionChangedError extends Error {
  constructor() {
    super('The signed-in account changed before deletion was confirmed.');
  }
}

export async function completeCurrentAccountDeletion(
  expectedUserId: string,
  dependencies: AccountDeletionDependencies,
): Promise<AccountDeletionResult> {
  const initialSession = await dependencies.getSession();
  if (!initialSession) throw new Error('You need to be signed in to delete your account.');
  if (initialSession.user.id !== expectedUserId) throw new AccountDeletionSessionChangedError();

  const deletedUserId = expectedUserId;
  await dependencies.requestDeletion(initialSession.access_token);

  // Do not clear a different account if an auth event or account switch happened
  // while the request was in flight.
  const currentSession = await dependencies.getSession();
  if (currentSession?.user.id !== deletedUserId) {
    return { didClearCurrentSession: false };
  }

  try {
    await dependencies.clearRevenueCatIdentity();
    await dependencies.signOutLocally();
  } catch {
    // The server may already have deleted the account. Do not let callers say
    // that nothing changed when only local cleanup failed.
    throw new AccountDeletionCleanupError();
  }
  return { didClearCurrentSession: true };
}
