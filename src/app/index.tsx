import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { type Region } from 'react-native-maps';

const INITIAL_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 38,
  longitudeDelta: 38,
};

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        accessibilityLabel="NeighborGlow map. Pan or zoom to explore the area."
        initialRegion={INITIAL_REGION}
        mapType="standard"
        style={styles.map}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View accessible accessibilityRole="header" style={styles.wordmark}>
          <Text style={styles.title}>NeighborGlow</Text>
          <Text style={styles.subtitle}>Halloween 2026</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 16,
  },
  wordmark: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(21, 16, 31, 0.92)',
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  title: {
    color: '#F7A84A',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#F2EDF8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
