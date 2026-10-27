import * as Linking from 'expo-linking';

export const PRIVACY_POLICY_URL = 'https://cadeschiano.github.io/NeighborGlow/privacy/';
export const TERMS_OF_SERVICE_URL = 'https://cadeschiano.github.io/NeighborGlow/terms/';

export async function openLegalDocument(url: typeof PRIVACY_POLICY_URL | typeof TERMS_OF_SERVICE_URL) {
  await Linking.openURL(url);
}
