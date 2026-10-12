import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';

import { AuthForm } from '@/features/auth/components/auth-form';

export default function SignInScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Link accessibilityRole="link" href="/" style={styles.backLink}>
          Back to map
        </Link>
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
  backLink: {
    color: '#D9B8FF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
});
