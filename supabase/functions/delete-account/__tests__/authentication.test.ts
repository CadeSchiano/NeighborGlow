import { getAuthenticatedAccount } from '../authentication';

describe('delete-account authentication', () => {
  it('rejects a request without an authorization credential before user lookup', async () => {
    const getUser = jest.fn();
    await expect(getAuthenticatedAccount(null, getUser)).resolves.toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('rejects invalid credentials when Supabase Auth cannot verify a user', async () => {
    await expect(getAuthenticatedAccount('Bearer invalid', jest.fn().mockResolvedValue({
      data: { user: null },
      error: new Error('invalid JWT'),
    }))).resolves.toBeNull();
  });

  it('returns only the account established by verified Supabase Auth', async () => {
    await expect(getAuthenticatedAccount('Bearer valid', jest.fn().mockResolvedValue({
      data: { user: { id: 'account-a' } },
      error: null,
    }))).resolves.toEqual({ id: 'account-a' });
  });
});
