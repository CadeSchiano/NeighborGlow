import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { AuthForm } from '@/features/auth/components/auth-form';

export default function SignInScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Link accessibilityRole="link" href="/" style={styles.backLink}>
          ‹ Back to map
        </Link>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>Neighbor<Text style={styles.brandAccent}>Glow</Text></Text>
          <Text style={styles.brandDescription}>Homeowners keep Halloween night glowing.</Text>
        </View>
        <AuthForm />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#15101F',
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  brandBlock: {
    marginBottom: 12,
    marginTop: 30,
  },
  brand: {
    color: '#F8F4FC',
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  brandAccent: {
    color: '#FF9E3D',
  },
  brandDescription: {
    color: '#CDBFDD',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 5,
  },
  backLink: {
    color: '#D9B8FF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
});
