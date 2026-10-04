import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          NeighborGlow
        </Text>
        <Text style={styles.message}>The Halloween map is coming next.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#15101F',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#F7A84A',
    fontSize: 32,
    fontWeight: '700',
  },
  message: {
    color: '#F2EDF8',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});
