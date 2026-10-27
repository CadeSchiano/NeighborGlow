import { createRevenueCatIdentitySynchronizer } from '../revenuecat-identity-sync';
import { isUserCancelledPurchase } from '../purchase-error';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

describe('RevenueCat identity synchronization', () => {
  it('does not initialize RevenueCat for anonymous startup or duplicate anonymous auth events', async () => {
    const configure = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const logIn = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    const synchronizer = createRevenueCatIdentitySynchronizer({ configure, logIn });

    await expect(synchronizer.sync(null)).resolves.toBe(false);
    await expect(synchronizer.sync(null)).resolves.toBe(false);

    expect(configure).not.toHaveBeenCalled();
    expect(logIn).not.toHaveBeenCalled();
    expect(synchronizer.getIdentity()).toEqual({ isReady: false, userId: null });
  });

  it('deduplicates repeated auth events for an authenticated user', async () => {
    const configure = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const logIn = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    const synchronizer = createRevenueCatIdentitySynchronizer({ configure, logIn });

    const first = synchronizer.sync('user-a');
    const duplicate = synchronizer.sync('user-a');

    expect(first).toBe(duplicate);
    await expect(first).resolves.toBe(true);
    expect(configure).toHaveBeenCalledTimes(1);
    expect(logIn).toHaveBeenCalledTimes(1);
    expect(logIn).toHaveBeenCalledWith('user-a');
  });

  it('invalidates a stale login after sign-out without logging out an anonymous RevenueCat customer', async () => {
    const login = deferred<void>();
    const configure = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const logIn = jest.fn<Promise<void>, [string]>().mockReturnValue(login.promise);
    const synchronizer = createRevenueCatIdentitySynchronizer({ configure, logIn });

    const staleLogin = synchronizer.sync('user-a');
    await Promise.resolve();
    await expect(synchronizer.sync(null)).resolves.toBe(false);
    login.resolve(undefined);

    await expect(staleLogin).resolves.toBe(false);
    expect(synchronizer.getIdentity()).toEqual({ isReady: false, userId: null });
  });

  it('serializes account switching and only exposes the latest authenticated user', async () => {
    const calls: string[] = [];
    const configure = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const logIn = jest.fn<Promise<void>, [string]>().mockImplementation(async (userId) => { calls.push(userId); });
    const synchronizer = createRevenueCatIdentitySynchronizer({ configure, logIn });

    const first = synchronizer.sync('user-a');
    const second = synchronizer.sync('user-b');

    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    expect(calls).toEqual(['user-a', 'user-b']);
    expect(synchronizer.getIdentity()).toEqual({ isReady: true, userId: 'user-b' });
  });

  it('treats a user-cancelled purchase as a nonfatal outcome', () => {
    expect(isUserCancelledPurchase({ userCancelled: true })).toBe(true);
    expect(isUserCancelledPurchase(new Error('network failure'))).toBe(false);
  });
});
