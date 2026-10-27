import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/providers/auth-provider';
import { getCandyFinderPlusStatus } from '@/features/candy-finder-plus/services/candy-finder-plus';
import { deleteCurrentAccount } from '@/features/auth/services/delete-account';
import { AccountDeletionCleanupError, AccountDeletionSessionChangedError } from '@/features/auth/services/account-deletion-state';

export default function ProfileScreen() {
  const { session } = useAuth();
  const [hasPass, setHasPass] = useState(false);
  const [passUserId, setPassUserId] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState<string | null>(null);
  const hasPassForCurrentUser = hasPass && passUserId === session?.user.id;

  useEffect(() => {
    if (!session) {
      return;
    }

    const userId = session.user.id;
    void getCandyFinderPlusStatus()
      .then((status) => {
        setHasPass(status.is_active);
        setPassUserId(userId);
      })
      .catch(() => {
        setHasPass(false);
        setPassUserId(userId);
      });
  }, [session]);

  const deleteAccount = async (expectedUserId: string) => {
    setIsDeletingAccount(true);
    setDeletionMessage(null);
    try {
      const result = await deleteCurrentAccount(expectedUserId);
      if (result.didClearCurrentSession) {
        router.replace('/');
        return;
      }
      setDeletionMessage('Your account was deleted. Another account is currently signed in.');
    } catch (error) {
      setDeletionMessage(
        error instanceof AccountDeletionCleanupError
          ? 'Your account was deleted, but this device could not finish signing out. Close and reopen the app before continuing.'
          : error instanceof AccountDeletionSessionChangedError
            ? 'Your signed-in account changed. No account was deleted. Review the active account and try again.'
          : 'We could not delete your account. Nothing was removed. Please try again.',
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const confirmAccountDeletion = () => {
    const expectedUserId = session?.user.id;
    if (!expectedUserId) return;

    Alert.alert(
      'Delete account permanently?',
      'This permanently deletes your NeighborGlow account, house listing, candy details, confirmations, reports, and Candy Finder+ access. It also requests deletion of connected RevenueCat customer data. This cannot be undone. It does not refund or delete Apple transaction history. An eligible purchase may be restored to a new NeighborGlow account using the same Apple Account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void deleteAccount(expectedUserId) },
      ],
    );
  };

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
            {hasPassForCurrentUser ? <View style={styles.badge}><Text style={styles.badgeText}>♛ 2026 Halloween Pass Holder</Text></View> : null}
            <Link href="/list-house" style={styles.primaryLink}>Manage my house listing</Link>
            <Link href="/sign-in" style={styles.rowLink}>Account and sign out <Text style={styles.rowArrow}>›</Text></Link>
            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Delete account</Text>
              <Text style={styles.dangerDescription}>Permanently remove your NeighborGlow account and associated app data. This requests deletion of connected RevenueCat data, but does not refund or remove Apple transaction history. An eligible purchase may be restored to a new account with the same Apple Account.</Text>
              {deletionMessage ? <Text accessibilityLiveRegion="polite" style={styles.deletionMessage}>{deletionMessage}</Text> : null}
              <Pressable
                accessibilityLabel="Delete account"
                accessibilityRole="button"
                accessibilityState={{ disabled: isDeletingAccount }}
                disabled={isDeletingAccount}
                onPress={confirmAccountDeletion}
                style={({ pressed }) => [styles.deleteButton, (pressed || isDeletingAccount) && styles.deleteButtonDisabled]}
              >
                {isDeletingAccount ? <ActivityIndicator color="#FFE9E9" /> : <Text style={styles.deleteButtonText}>Delete account</Text>}
              </Pressable>
            </View>
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
          <Text style={styles.infoText}>{hasPassForCurrentUser ? 'Your 2026 Halloween Pass is active.' : 'Unlock exact candy details and full-size discovery.'}</Text>
          <Link href="/candy-finder-plus" style={styles.infoLink}>{hasPassForCurrentUser ? 'Manage pass' : 'Get the 2026 Pass'}</Link>
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
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(138, 84, 207, 0.32)', borderColor: '#B77AFF', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: '#F0D9FF', fontSize: 13, fontWeight: '800' },
  primaryLink: { backgroundColor: '#FF9E3D', borderRadius: 14, color: '#1A1023', fontSize: 16, fontWeight: '800', overflow: 'hidden', padding: 16, textAlign: 'center' },
  rowLink: { backgroundColor: '#21152F', borderColor: 'rgba(217, 184, 255, 0.3)', borderRadius: 14, borderWidth: 1, color: '#F8F4FC', fontSize: 16, fontWeight: '700', padding: 16 },
  rowArrow: { color: '#D9B8FF', fontSize: 22 },
  dangerZone: { backgroundColor: 'rgba(104, 31, 42, 0.26)', borderColor: 'rgba(255, 117, 117, 0.5)', borderRadius: 18, borderWidth: 1, gap: 9, padding: 16 },
  dangerTitle: { color: '#FFE1E1', fontSize: 17, fontWeight: '800' },
  dangerDescription: { color: '#F1C8CC', fontSize: 14, lineHeight: 20 },
  deletionMessage: { color: '#FFE1A8', fontSize: 13, lineHeight: 19 },
  deleteButton: { alignItems: 'center', borderColor: '#FF8787', borderRadius: 12, borderWidth: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  deleteButtonDisabled: { opacity: 0.55 },
  deleteButtonText: { color: '#FFE1E1', fontSize: 15, fontWeight: '800' },
  emptyCard: { backgroundColor: '#21152F', borderColor: 'rgba(178, 112, 255, 0.42)', borderRadius: 20, borderWidth: 1, gap: 10, padding: 18 },
  emptyTitle: { color: '#F8F4FC', fontSize: 19, fontWeight: '800' },
  emptyDescription: { color: '#D9CBE8', fontSize: 15, lineHeight: 21 },
  infoCard: { backgroundColor: 'rgba(80, 48, 120, 0.38)', borderColor: 'rgba(178, 112, 255, 0.54)', borderRadius: 20, borderWidth: 1, gap: 6, padding: 18 },
  infoTitle: { color: '#E9D3FF', fontSize: 17, fontWeight: '800' },
  infoText: { color: '#D9CBE8', fontSize: 14 },
  infoLink: { color: '#D9B8FF', fontSize: 14, fontWeight: '800', marginTop: 4 },
});
