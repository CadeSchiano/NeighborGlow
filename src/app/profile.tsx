import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/providers/auth-provider';

export default function ProfileScreen() {
  const { session } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Link href="/" style={styles.backLink}>‹ Back to map</Link>
        <Text style={styles.eyebrow}>YOUR NEIGHBORHOOD</Text>
        <Text style={styles.title}>Profile</Text>
        {session ? (
          <>
            <View style={styles.identityCard}>
              <View style={styles.avatar}><Text style={styles.avatarText}>🎃</Text></View>
              <View style={styles.identityText}>
                <Text style={styles.email}>{session.user.email}</Text>
                <Text style={styles.identityDescription}>Signed in for Halloween 2026</Text>
              </View>
            </View>
            <Link href="/list-house" style={styles.primaryLink}>Manage my house listing</Link>
            <Link href="/sign-in" style={styles.rowLink}>Account and sign out <Text style={styles.rowArrow}>›</Text></Link>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Keep the map open to everyone</Text>
            <Text style={styles.emptyDescription}>
              Sign in only when you want to list your house, confirm candy, or report an issue.
            </Text>
            <Link href="/sign-in" style={styles.primaryLink}>Sign in or create an account</Link>
          </View>
        )}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Candy Finder+</Text>
          <Text style={styles.infoText}>Coming soon for the Halloween season.</Text>
          <Link href="/candy-finder-plus" style={styles.infoLink}>Learn more</Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#100A1B', flex: 1 },
  content: { gap: 16, padding: 20 },
  backLink: { color: '#D9B8FF', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  eyebrow: { color: '#FFAA4D', fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: '#F8F4FC', fontSize: 34, fontWeight: '800' },
  identityCard: { alignItems: 'center', backgroundColor: '#21152F', borderColor: 'rgba(178, 112, 255, 0.42)', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 18 },
  avatar: { alignItems: 'center', backgroundColor: '#4E326B', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  avatarText: { fontSize: 26 },
  identityText: { flex: 1, gap: 3 },
  email: { color: '#F8F4FC', fontSize: 16, fontWeight: '700' },
  identityDescription: { color: '#BDAFCB', fontSize: 13 },
  primaryLink: { backgroundColor: '#FF9E3D', borderRadius: 14, color: '#1A1023', fontSize: 16, fontWeight: '800', overflow: 'hidden', padding: 16, textAlign: 'center' },
  rowLink: { backgroundColor: '#21152F', borderColor: 'rgba(217, 184, 255, 0.3)', borderRadius: 14, borderWidth: 1, color: '#F8F4FC', fontSize: 16, fontWeight: '700', padding: 16 },
  rowArrow: { color: '#D9B8FF', fontSize: 22 },
  emptyCard: { backgroundColor: '#21152F', borderColor: 'rgba(178, 112, 255, 0.42)', borderRadius: 20, borderWidth: 1, gap: 10, padding: 18 },
  emptyTitle: { color: '#F8F4FC', fontSize: 19, fontWeight: '800' },
  emptyDescription: { color: '#D9CBE8', fontSize: 15, lineHeight: 21 },
  infoCard: { backgroundColor: 'rgba(80, 48, 120, 0.38)', borderColor: 'rgba(178, 112, 255, 0.54)', borderRadius: 20, borderWidth: 1, gap: 6, padding: 18 },
  infoTitle: { color: '#E9D3FF', fontSize: 17, fontWeight: '800' },
  infoText: { color: '#D9CBE8', fontSize: 14 },
  infoLink: { color: '#D9B8FF', fontSize: 14, fontWeight: '800', marginTop: 4 },
});
