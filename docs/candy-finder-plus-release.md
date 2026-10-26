# Candy Finder+ 2026 release setup

## RevenueCat dashboard

1. Add the Apple App Store app with bundle ID `com.cadeschiano.neighborglow`.
2. Import `com.cadeschiano.neighborglow.candyfinder2026` from App Store Connect.
3. Attach that product to the `candy_finder_plus_2026` entitlement.
4. Add the product to the `default` offering as package `$rc_lifetime`.
5. Configure the webhook for both sandbox and production events:

   `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`

6. Set the webhook Authorization header to the exact `REVENUECAT_WEBHOOK_AUTHORIZATION` server secret.
7. Enable HMAC signing and put RevenueCat's signing secret in `REVENUECAT_WEBHOOK_SIGNING_SECRET`.

The function requires the expected App Store product, entitlement, App Store source, HMAC signature, and a matching RevenueCat subscriber record before granting access. It records webhook IDs so retries are idempotent.

## Supabase

Apply the database migration, then configure and deploy the Edge Function:

```bash
npx supabase db push
npx supabase secrets set REVENUECAT_WEBHOOK_AUTHORIZATION="Bearer <long-random-value>"
npx supabase secrets set REVENUECAT_WEBHOOK_SIGNING_SECRET="<RevenueCat-HMAC-secret>"
npx supabase secrets set REVENUECAT_SECRET_API_KEY="<RevenueCat-secret-API-key>"
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to hosted Edge Functions by Supabase. They must never be copied into the Expo app.

The pass is a permanent Apple non-consumable purchase, but NeighborGlow grants in-app Candy Finder+ access only through `2026-11-01T04:00:00Z`, the end of Halloween in US Eastern time. A future season needs a separate product and entitlement design.

## EAS build setup

Set the public RevenueCat key in the EAS production and development environments as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`. This is the only RevenueCat value that belongs in an app build.

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform ios --profile development
npx eas-cli@latest build --platform ios --profile production
```

Use the development build for sandbox testing. Submit a reviewed production build to TestFlight only when testing passes:

```bash
npx eas-cli@latest submit --platform ios --latest --profile production
```

## Manual purchase test matrix

- Sign in, buy the `$rc_lifetime` package with an Apple sandbox tester, and verify the account badge plus premium map unlock.
- Restore the same purchase after reinstalling or signing back in.
- Confirm a different authenticated account has no premium data before restore/transfer.
- Confirm a non-entitled account receives a backend permission error for all premium RPCs.
- Confirm an invalid product or duplicate webhook event creates no duplicate entitlement.
- Confirm filters return only active houses inside the bounded viewport, and show a clean empty state when no house matches.

## App Review screenshot and notes

Navigation path: **Map → Candy Finder+ soon → Get the 2026 Pass**.

Capture the real review screenshot from a signed-in iPhone development/TestFlight build after RevenueCat loads the offering and displays its localized price. In Simulator, use **File → Save Screen**; on an iPhone, take a normal device screenshot. Do not submit a generated mockup.

Suggested App Review note:

> NeighborGlow is free to download. Candy Finder+ Halloween 2026 is a $2.99, one-time, non-consumable in-app purchase with no subscription. Sign in with the provided review account, open Map, choose Candy Finder+, then select Get the 2026 Pass. It unlocks exact homeowner-provided candy details and filters for active 2026 Halloween listings. Restore Purchases is available on the same screen.
