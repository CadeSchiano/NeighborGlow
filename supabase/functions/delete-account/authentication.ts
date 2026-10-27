export type AuthenticatedAccount = { id: string };

type GetUser = () => Promise<{
  data: { user: AuthenticatedAccount | null };
  error: unknown | null;
}>;

/** The deletion target comes only from Supabase Auth's verified user. */
export async function getAuthenticatedAccount(authorization: string | null, getUser: GetUser) {
  if (!authorization) return null;

  const { data: { user }, error } = await getUser();
  if (error || !user) return null;
  return user;
}
