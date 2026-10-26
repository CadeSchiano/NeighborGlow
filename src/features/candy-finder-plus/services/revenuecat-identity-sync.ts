export type RevenueCatIdentity = {
  isReady: boolean;
  userId: string | null;
};

type RevenueCatIdentityOperations = {
  configure: () => Promise<void>;
  logIn: (userId: string) => Promise<void>;
};

/**
 * Keeps RevenueCat limited to authenticated purchasers. A Supabase sign-out
 * invalidates local readiness without creating or logging out an anonymous
 * RevenueCat customer; the next account is identified by a direct logIn.
 */
export function createRevenueCatIdentitySynchronizer(operations: RevenueCatIdentityOperations) {
  let identity: RevenueCatIdentity = { isReady: false, userId: null };
  let identityQueue: Promise<void> = Promise.resolve();
  let identityRequest = 0;
  let pendingUserId: string | null = null;
  let pendingSync: Promise<boolean> | null = null;

  const sync = (userId: string | null): Promise<boolean> => {
    if (userId === null) {
      identityRequest += 1;
      identity = { isReady: false, userId: null };
      pendingUserId = null;
      return Promise.resolve(false);
    }

    if (identity.isReady && identity.userId === userId) return Promise.resolve(true);
    if (pendingUserId === userId && pendingSync) return pendingSync;

    const request = ++identityRequest;
    identity = { isReady: false, userId: null };
    pendingUserId = userId;

    const result = identityQueue.catch(() => undefined).then(async () => {
      await operations.configure();
      await operations.logIn(userId);

      const isCurrent = request === identityRequest;
      if (isCurrent) identity = { isReady: true, userId };
      return isCurrent;
    });

    identityQueue = result.then(() => undefined, () => undefined);
    pendingSync = result.finally(() => {
      if (pendingUserId === userId) {
        pendingUserId = null;
        pendingSync = null;
      }
    });

    return pendingSync;
  };

  return {
    getIdentity: () => identity,
    sync,
  };
}
