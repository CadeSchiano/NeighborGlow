# NeighborGlow

NeighborGlow is a cross-platform Halloween neighborhood activity map. Anonymous visitors can browse the map; authentication is reserved for contributions and modifications.

## Local development

1. Copy `.env.example` to `.env` when public runtime configuration is introduced.
2. Run `npm start`.

Run checks before submitting changes:

```sh
npm run lint
npm run typecheck
```

## Privacy baseline

The Glow must only consume and display aggregated, coarsened activity. Never add another user's live location or location history to a client-visible API or map layer.

## Google Maps release configuration

The initial map screen runs in Expo Go without a project API key. Before creating a native development or production build that uses Google Maps, configure platform-restricted Google Maps SDK keys through the `react-native-maps` Expo config plugin. Keep those values in local or EAS environment configuration, never in Git.

## Supabase setup

1. Create the NeighborGlow project in Supabase.
2. Copy the Project URL and publishable key from its Connect dialog into a local `.env` file using `.env.example` as the template.
3. Never add a service-role key, database password, or other privileged credential to an Expo environment variable or mobile app.

The app currently creates anonymous Supabase clients only. Authentication and session persistence will be configured with the contributor account flow. Database schema, PostGIS, migrations, and Row Level Security belong to the next backend phase.

## Database migrations

All schema changes live in `supabase/migrations/` and must be reviewed, committed, and deployed through the Supabase CLI. Do not make schema changes directly in the Dashboard after this point.

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
```

The first migration installs PostGIS in the `extensions` schema, never `public`, and enables RLS with explicit grants and policies. Run local database tests with `npx supabase start` and `npx supabase db reset`; Docker is required for that local stack.
