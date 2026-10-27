import { AccountDeletionCleanupError, AccountDeletionSessionChangedError, completeCurrentAccountDeletion } from '../account-deletion-state';
import { deleteAuthenticatedAccount } from '../../../../../supabase/functions/delete-account/account-deletion';

const sessionFor = (id: string) => ({ user: { id }, access_token: `${id}-token` }) as never;

describe('account deletion', () => {
  it('deletes the verified user only after RevenueCat deletion is confirmed', async () => {
    const deleteRevenueCatCustomer = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const deleteSupabaseUser = jest.fn().mockResolvedValue(undefined);

    await deleteAuthenticatedAccount('account-a', { deleteRevenueCatCustomer, deleteSupabaseUser });

    expect(deleteRevenueCatCustomer).toHaveBeenCalledWith('account-a');
    expect(deleteSupabaseUser).toHaveBeenCalledWith('account-a');
  });

  it('accepts RevenueCat 404 as an idempotent already-deleted result', async () => {
    const deleteSupabaseUser = jest.fn().mockResolvedValue(undefined);
    await deleteAuthenticatedAccount('account-a', {
      deleteRevenueCatCustomer: jest.fn().mockResolvedValue({ ok: true, status: 404 }),
      deleteSupabaseUser,
    });
    expect(deleteSupabaseUser).toHaveBeenCalledWith('account-a');
  });

  it('does not delete Supabase data when RevenueCat deletion fails', async () => {
    const deleteSupabaseUser = jest.fn();
    await expect(deleteAuthenticatedAccount('account-a', {
      deleteRevenueCatCustomer: jest.fn().mockResolvedValue({ ok: false, status: 503 }),
      deleteSupabaseUser,
    })).rejects.toThrow('RevenueCat customer deletion could not be confirmed.');
    expect(deleteSupabaseUser).not.toHaveBeenCalled();
  });

  it('clears local auth and premium identity after deleting the current account', async () => {
    const getSession = jest.fn()
      .mockResolvedValueOnce(sessionFor('account-a'))
      .mockResolvedValueOnce(sessionFor('account-a'));
    const clearRevenueCatIdentity = jest.fn().mockResolvedValue(false);
    const signOutLocally = jest.fn().mockResolvedValue(undefined);

    await expect(completeCurrentAccountDeletion('account-a', {
      getSession,
      requestDeletion: jest.fn().mockResolvedValue(undefined),
      clearRevenueCatIdentity,
      signOutLocally,
    })).resolves.toEqual({ didClearCurrentSession: true });
    expect(clearRevenueCatIdentity).toHaveBeenCalledTimes(1);
    expect(signOutLocally).toHaveBeenCalledTimes(1);
  });

  it('does not sign out another account after an account switch', async () => {
    const clearRevenueCatIdentity = jest.fn();
    const signOutLocally = jest.fn();
    await expect(completeCurrentAccountDeletion('account-a', {
      getSession: jest.fn()
        .mockResolvedValueOnce(sessionFor('account-a'))
        .mockResolvedValueOnce(sessionFor('account-b')),
      requestDeletion: jest.fn().mockResolvedValue(undefined),
      clearRevenueCatIdentity,
      signOutLocally,
    })).resolves.toEqual({ didClearCurrentSession: false });
    expect(clearRevenueCatIdentity).not.toHaveBeenCalled();
    expect(signOutLocally).not.toHaveBeenCalled();
  });

  it('does not request deletion without an authenticated session', async () => {
    const requestDeletion = jest.fn();
    await expect(completeCurrentAccountDeletion('account-a', {
      getSession: jest.fn().mockResolvedValue(null),
      requestDeletion,
      clearRevenueCatIdentity: jest.fn(),
      signOutLocally: jest.fn(),
    })).rejects.toThrow('You need to be signed in');
    expect(requestDeletion).not.toHaveBeenCalled();
  });

  it('does not report a normal completion when local cleanup fails after deletion', async () => {
    await expect(completeCurrentAccountDeletion('account-a', {
      getSession: jest.fn()
        .mockResolvedValueOnce(sessionFor('account-a'))
        .mockResolvedValueOnce(sessionFor('account-a')),
      requestDeletion: jest.fn().mockResolvedValue(undefined),
      clearRevenueCatIdentity: jest.fn().mockResolvedValue(false),
      signOutLocally: jest.fn().mockRejectedValue(new Error('storage unavailable')),
    })).rejects.toBeInstanceOf(AccountDeletionCleanupError);
  });

  it('does not invoke deletion when Profile showed account A but the active session is account B', async () => {
    const requestDeletion = jest.fn();
    await expect(completeCurrentAccountDeletion('account-a', {
      getSession: jest.fn().mockResolvedValue(sessionFor('account-b')),
      requestDeletion,
      clearRevenueCatIdentity: jest.fn(),
      signOutLocally: jest.fn(),
    })).rejects.toBeInstanceOf(AccountDeletionSessionChangedError);
    expect(requestDeletion).not.toHaveBeenCalled();
  });

  it('retries safely after RevenueCat succeeded but Supabase deletion failed', async () => {
    const deleteSupabaseUser = jest.fn()
      .mockRejectedValueOnce(new Error('temporary Supabase failure'))
      .mockResolvedValueOnce(undefined);
    const deleteRevenueCatCustomer = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 404 });

    await expect(deleteAuthenticatedAccount('account-a', { deleteRevenueCatCustomer, deleteSupabaseUser }))
      .rejects.toThrow('temporary Supabase failure');
    await expect(deleteAuthenticatedAccount('account-a', { deleteRevenueCatCustomer, deleteSupabaseUser }))
      .resolves.toBeUndefined();
    expect(deleteSupabaseUser).toHaveBeenCalledTimes(2);
  });
});
