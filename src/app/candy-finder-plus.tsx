import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/providers/auth-provider';
import {
  getCandyFinderPlusStatus,
  type CandyFinderPlusStatus,
} from '@/features/candy-finder-plus/services/candy-finder-plus';

export default function CandyFinderPlusScreen() {
  const { isLoading, session } = useAuth();
  const [status, setStatus] = useState<CandyFinderPlusStatus | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session) {
      return;
    }

    let isCurrent = true;

    const loadStatus = async () => {
      try {
        const nextStatus = await getCandyFinderPlusStatus();

        if (isCurrent) {
          setStatus(nextStatus);
        }
      } catch {
        if (isCurrent) {
          setMessage('We could not check your Candy Finder+ pass right now.');
        }
      }
    };

    void loadStatus();

    return () => {
      isCurrent = false;
    };
  }, [session]);

  if (isLoading) {
    return <View style={styles.loadingScreen}><ActivityIndicator color="#FFAA4D" /></View>;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Link href="/" style={styles.backLink}>Back to map</Link>
        <Text style={styles.eyebrow}>HALLOWEEN SEASON PASS</Text>
        <Text style={styles.title}>Candy Finder+</Text>
        <Text style={styles.description}>
          Find full-size treats and see exact homeowner-provided candy details while listings are active.
        </Text>
        {status?.is_active ? (
          <View style={styles.activeCard}>
            <Text style={styles.activeTitle}>Your pass is active</Text>
            <Text style={styles.activeText}>Use the Full-size filter on the map and open a house to view its candy details.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pass purchases are not available yet</Text>
            <Text style={styles.cardText}>
              The secure entitlement and premium map experience are ready. Store purchasing and restore support will be enabled before launch.
            </Text>
          </View>
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#15101F', flex: 1 },
  loadingScreen: { alignItems: 'center', backgroundColor: '#15101F', flex: 1, justifyContent: 'center' },
  content: { gap: 16, padding: 20 },
  backLink: { color: '#D9B8FF', fontSize: 16, fontWeight: '600', marginBottom: 14 },
  eyebrow: { color: '#FFAA4D', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#F8F4FC', fontSize: 32, fontWeight: '800' },
  description: { color: '#E9DDF5', fontSize: 16, lineHeight: 23 },
  card: { backgroundColor: 'rgba(70, 38, 101, 0.7)', borderColor: '#8E5DCC', borderRadius: 18, borderWidth: 1, gap: 8, padding: 18 },
  activeCard: { backgroundColor: 'rgba(70, 125, 77, 0.42)', borderColor: '#6ECF7A', borderRadius: 18, borderWidth: 1, gap: 8, padding: 18 },
  cardTitle: { color: '#F8F4FC', fontSize: 18, fontWeight: '700' },
  activeTitle: { color: '#A8F0AE', fontSize: 18, fontWeight: '700' },
  cardText: { color: '#E9DDF5', fontSize: 14, lineHeight: 20 },
  activeText: { color: '#E1F9E4', fontSize: 14, lineHeight: 20 },
  message: { color: '#FFB4A3', fontSize: 14 },
});
