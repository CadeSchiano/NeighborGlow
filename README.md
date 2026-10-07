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
