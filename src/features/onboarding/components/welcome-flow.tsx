import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type WelcomeFlowProps = {
  isRequestingLocation: boolean;
  onAllowLocation: () => Promise<void>;
  onComplete: () => void;
};

export function WelcomeFlow({ isRequestingLocation, onAllowLocation, onComplete }: WelcomeFlowProps) {
  const [stage, setStage] = useState<'splash' | 'location'>('splash');
  const requestLocation = async () => {
    await onAllowLocation();
    onComplete();
  };

  return (
    <View accessibilityViewIsModal style={styles.backdrop}>
      <View style={styles.stars} pointerEvents="none">
        <Text style={styles.starOne}>✦</Text>
        <Text style={styles.starTwo}>✧</Text>
        <Text style={styles.starThree}>✦</Text>
      </View>
      {stage === 'splash' ? (
        <View style={styles.card}>
          <Text style={styles.pumpkin}>🎃</Text>
          <Text style={styles.wordmark}>Neighbor<Text style={styles.wordmarkAccent}>Glow</Text></Text>
          <Text style={styles.tagline}>See what’s happening in your neighborhood.</Text>
          <View style={styles.divider} />
          <Text style={styles.description}>Find participating trick-or-treat homes and help keep Halloween night glowing.</Text>
          <Pressable accessibilityRole="button" onPress={() => setStage('location')} style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryButtonPressed : null]}>
            <Text style={styles.primaryButtonText}>Get started</Text>
          </Pressable>
        </View>
      ) : (
      <View style={styles.card}>
        <Text style={styles.pumpkin}>🎃</Text>
        <Text style={styles.heading}>See what’s happening around you</Text>
        <Text style={styles.description}>
          Use your location to center the map on nearby trick-or-treat homes. You can always skip and browse another area.
        </Text>
        <Pressable
          accessibilityLabel="Allow location access"
          accessibilityRole="button"
          disabled={isRequestingLocation}
          onPress={() => void requestLocation()}
          style={({ pressed }) => [styles.primaryButton, pressed && !isRequestingLocation ? styles.primaryButtonPressed : null]}
        >
          {isRequestingLocation ? <ActivityIndicator color="#1A1023" /> : null}
          <Text style={[styles.primaryButtonText, isRequestingLocation ? styles.loadingText : null]}>
            {isRequestingLocation ? 'Finding your location…' : 'Allow location'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={isRequestingLocation} onPress={onComplete}>
          <Text style={styles.skipText}>Not now</Text>
        </Pressable>
        <Text style={styles.privacyText}>NeighborGlow never shares or tracks your live location.</Text>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: '#100A1B',
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  stars: {
    ...StyleSheet.absoluteFill,
  },
  starOne: { color: '#7F58C9', fontSize: 28, left: '14%', position: 'absolute', top: '17%' },
  starTwo: { color: '#FFAA4D', fontSize: 22, position: 'absolute', right: '17%', top: '25%' },
  starThree: { bottom: '21%', color: '#7F58C9', fontSize: 24, left: '20%', position: 'absolute' },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(29, 18, 44, 0.96)',
    borderColor: 'rgba(178, 112, 255, 0.56)',
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    maxWidth: 420,
    padding: 28,
    width: '100%',
  },
  pumpkin: { fontSize: 68, marginBottom: 2 },
  wordmark: { color: '#F8F4FC', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  wordmarkAccent: { color: '#FF9E3D' },
  tagline: { color: '#D9CBE8', fontSize: 16, textAlign: 'center' },
  divider: { backgroundColor: 'rgba(217, 184, 255, 0.28)', height: 1, marginVertical: 4, width: '100%' },
  heading: { color: '#F8F4FC', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  description: { color: '#D9CBE8', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#9A62FF',
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 54,
    width: '100%',
  },
  primaryButtonPressed: { backgroundColor: '#7E43E7' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  loadingText: { marginLeft: 8 },
  skipText: { color: '#C8A6FF', fontSize: 15, fontWeight: '700', padding: 8 },
  privacyText: { color: '#9E90B1', fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
