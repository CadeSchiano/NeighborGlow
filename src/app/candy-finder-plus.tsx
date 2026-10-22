import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CandyFinderPlusScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Link href="/" style={styles.backLink}>Back to map</Link>
        <Text style={styles.eyebrow}>COMING HALLOWEEN 2026</Text>
        <Text style={styles.title}>Candy Finder+</Text>
        <Text style={styles.description}>
          Find full-size treats and see exact homeowner-provided candy details while listings are active.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Candy Finder+ is coming soon</Text>
          <Text style={styles.cardText}>
            Pass purchases, exact candy details, and premium filters will appear here once they are ready for launch.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#15101F', flex: 1 },
  content: { gap: 16, padding: 20 },
  backLink: { color: '#D9B8FF', fontSize: 16, fontWeight: '600', marginBottom: 14 },
  eyebrow: { color: '#FFAA4D', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#F8F4FC', fontSize: 32, fontWeight: '800' },
  description: { color: '#E9DDF5', fontSize: 16, lineHeight: 23 },
  card: { backgroundColor: 'rgba(70, 38, 101, 0.7)', borderColor: '#8E5DCC', borderRadius: 18, borderWidth: 1, gap: 8, padding: 18 },
  cardTitle: { color: '#F8F4FC', fontSize: 18, fontWeight: '700' },
  cardText: { color: '#E9DDF5', fontSize: 14, lineHeight: 20 },
});
