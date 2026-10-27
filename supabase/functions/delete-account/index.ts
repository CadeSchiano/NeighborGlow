import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { deleteAuthenticatedAccount, type RevenueCatDeletionResult } from './account-deletion.ts';
import { getAuthenticatedAccount } from './authentication.ts';

function serverError() {
  return new Response('Account deletion could not be completed. Please try again.', { status: 500 });
}

async function deleteRevenueCatCustomer(userId: string, secretKey: string): Promise<RevenueCatDeletionResult> {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  // Do not log the customer ID, request, or response body. The status is
  // sufficient for operational diagnosis without exposing customer data.
  if (!response.ok && response.status !== 404) {
    console.error('RevenueCat customer deletion failed', { status: response.status });
  }

  return { ok: response.ok || response.status === 404, status: response.status };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authorization = request.headers.get('authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const revenueCatSecretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!authorization || !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !revenueCatSecretKey) {
    return serverError();
  }

  // Verify the bearer token again inside the function. No user ID is accepted
  // from the client, so a stale UI or switched account cannot select a target.
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const user = await getAuthenticatedAccount(authorization, () => userClient.auth.getUser());
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
  try {
    await deleteAuthenticatedAccount(user.id, {
      deleteRevenueCatCustomer: (userId) => deleteRevenueCatCustomer(userId, revenueCatSecretKey),
      deleteSupabaseUser: async (userId) => {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
      },
    });
  } catch {
    // Keep responses and logs free of account identifiers and upstream bodies.
    console.error('Account deletion failed');
    return serverError();
  }

  return Response.json({ deleted: true });
});
