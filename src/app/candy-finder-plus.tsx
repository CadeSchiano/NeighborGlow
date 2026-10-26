import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { useAuth } from '@/features/auth/providers/auth-provider';
import {
  CANDY_FINDER_PLUS_2026_PURCHASE_CUTOFF_LABEL,
  getCandyFinderPlusPurchaseBlockReason,
  isCandyFinderPlusSeasonActive,
} from '@/features/candy-finder-plus/services/premium-access';
import {
  getCandyFinderPlusPackage,
  getPurchaseAvailability,
  getRevenueCatIdentity,
  hasCandyFinderPlus,
  purchaseCandyFinderPlus,
  restoreCandyFinderPlus,
} from '@/features/candy-finder-plus/services/revenuecat';
import { getCandyFinderPlusStatus, waitForCandyFinderPlusEntitlement } from '@/features/candy-finder-plus/services/candy-finder-plus';

export default function CandyFinderPlusScreen() {
  const { isRevenueCatIdentityReady, session } = useAuth();
  const [aPackage, setPackage] = useState<PurchasesPackage | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const loadRequest = useRef(0);
  const availability = getPurchaseAvailability();

  const load = useCallback(async () => {
    const request = ++loadRequest.current;
    if (!session || !availability.available || !isRevenueCatIdentityReady) {
      if (request === loadRequest.current) setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [status, nextPackage] = await Promise.all([getCandyFinderPlusStatus(), getCandyFinderPlusPackage()]);
      if (request === loadRequest.current) {
        setIsActive(status.is_active);
        setPackage(nextPackage);
        setLoadedForUserId(session.user.id);
        if (!nextPackage && !status.is_active) setMessage('The 2026 Halloween Pass is not available from the App Store yet.');
      }
    } catch {
      if (request === loadRequest.current) setMessage('Candy Finder+ is temporarily unavailable. Please try again later.');
    } finally {
      if (request === loadRequest.current) setIsLoading(false);
    }
  }, [availability.available, isRevenueCatIdentityReady, session]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const purchase = async () => {
    const reason = getCandyFinderPlusPurchaseBlockReason({
      authenticatedUserId: session?.user.id,
      revenueCatUserId: getRevenueCatIdentity().userId,
      isRevenueCatIdentityReady,
      hasLifetimePackage: Boolean(aPackage),
    });
    if (reason) {
      setMessage(getPurchaseBlockMessage(reason));
      return;
    }
    setIsWorking(true);
    setMessage(null);
    try {
      const customerInfo = await purchaseCandyFinderPlus(aPackage!, session!.user.id);
      if (hasCandyFinderPlus(customerInfo)) {
        setMessage('Purchase confirmed. Securing your 2026 Halloween Pass…');
        const status = await waitForCandyFinderPlusEntitlement();
        setIsActive(status.is_active);
        setMessage(status.is_active ? 'Your 2026 Halloween Pass is active. Your badge is ready in Profile.' : 'Purchase confirmed, but activation is taking longer than expected. Use Restore Purchases shortly.');
      } else {
        setMessage('Your purchase is being confirmed. Please refresh this screen in a moment.');
      }
    } catch (error) {
      setMessage(Boolean((error as { userCancelled?: boolean } | null)?.userCancelled) ? 'Purchase cancelled.' : 'We could not complete your purchase. Please try again.');
    } finally { setIsWorking(false); }
  };

  const restore = async () => {
    if (!session || !isRevenueCatIdentityReady) {
      setMessage('Candy Finder+ is still connecting to this account. Please try again.');
      return;
    }
    setIsWorking(true);
    setMessage(null);
    try {
      const customerInfo = await restoreCandyFinderPlus(session.user.id);
      const restored = hasCandyFinderPlus(customerInfo);
      const status = restored ? await waitForCandyFinderPlusEntitlement() : { is_active: false };
      setIsActive(status.is_active);
      setMessage(status.is_active ? 'Your 2026 Halloween Pass has been restored.' : 'No active Candy Finder+ purchase was found for this Apple ID.');
    } catch { setMessage('We could not restore purchases. Please try again.'); }
    finally { setIsWorking(false); }
  };

  const purchaseBlockReason = getCandyFinderPlusPurchaseBlockReason({
    authenticatedUserId: session?.user.id,
    revenueCatUserId: getRevenueCatIdentity().userId,
    isRevenueCatIdentityReady,
    hasLifetimePackage: Boolean(aPackage),
  });
  const seasonIsActive = isCandyFinderPlusSeasonActive();
  const hasLoadedCurrentUser = loadedForUserId === session?.user.id;
  const hasActiveCurrentPass = hasLoadedCurrentUser && isActive && seasonIsActive;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Link href="/" style={styles.backLink}>Back to map</Link>
        <Text style={styles.crown}>♛</Text>
        <Text style={styles.eyebrow}>2026 HALLOWEEN PASS</Text>
        <Text style={styles.title}>Candy Finder+</Text>
        <Text style={styles.description}>$2.99 one-time purchase. No subscription. Find full-size treats and exact homeowner-provided candy details through {CANDY_FINDER_PLUS_2026_PURCHASE_CUTOFF_LABEL}.</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{hasActiveCurrentPass ? 'Your pass is active' : 'One Halloween pass'}</Text>
          <Text style={styles.cardText}>• Exact candy details{`\n`}• Full-size candy discovery{`\n`}• Candy-type filters{`\n`}• 2026 Pass Holder badge</Text>
        </View>
        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
        {!session ? <Link href="/sign-in" style={styles.primaryLink}>Sign in to purchase</Link> : null}
        {session && (isLoading || !isRevenueCatIdentityReady) ? <ActivityIndicator color="#FFAA4D" /> : null}
        {session && !isRevenueCatIdentityReady ? <Text style={styles.setupText}>Connecting Candy Finder+ to this account…</Text> : null}
        {session && !isLoading && !availability.available ? <Text style={styles.setupText}>{availability.reason === 'ios_only' ? 'Purchases are available on iPhone only.' : 'Purchases will open once the 2026 pass is available.'}</Text> : null}
        {session && !isLoading && isRevenueCatIdentityReady && availability.available && hasActiveCurrentPass ? <Link href={{ pathname: '/', params: { premium: '1' } }} style={styles.primaryLink}>Open premium map</Link> : null}
        {session && !isLoading && isRevenueCatIdentityReady && availability.available && !hasActiveCurrentPass ? <>
          {!seasonIsActive ? <Text style={styles.setupText}>New 2026 Halloween Pass purchases ended at {CANDY_FINDER_PLUS_2026_PURCHASE_CUTOFF_LABEL}.</Text> : null}
          {!aPackage && seasonIsActive ? <Text style={styles.setupText}>The 2026 Halloween Pass is not available from the App Store yet.</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(purchaseBlockReason) || isWorking }} disabled={Boolean(purchaseBlockReason) || isWorking} onPress={() => void purchase()} style={({ pressed }) => [styles.purchaseButton, (pressed || isWorking || purchaseBlockReason) && styles.buttonDisabled]}><Text style={styles.purchaseText}>{isWorking ? 'Working…' : `Get the 2026 Pass${aPackage ? ` · ${aPackage.product.priceString}` : ''}`}</Text></Pressable>
        </> : null}
        {session && !isLoading && isRevenueCatIdentityReady && availability.available ? <Pressable accessibilityRole="button" disabled={isWorking} onPress={() => void restore()} style={({ pressed }) => [styles.restoreButton, (pressed || isWorking) && styles.buttonDisabled]}><Text style={styles.restoreText}>Restore Purchases</Text></Pressable> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#15101F', flex: 1 }, content: { gap: 16, padding: 20 }, backLink: { color: '#D9B8FF', fontSize: 16, fontWeight: '600', marginBottom: 14 }, crown: { color: '#D9B8FF', fontSize: 46, marginBottom: -4, textAlign: 'center' }, eyebrow: { color: '#FFAA4D', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }, title: { color: '#F8F4FC', fontSize: 32, fontWeight: '800' }, description: { color: '#E9DDF5', fontSize: 16, lineHeight: 23 }, card: { backgroundColor: 'rgba(70, 38, 101, 0.7)', borderColor: '#8E5DCC', borderRadius: 22, borderWidth: 1, gap: 8, padding: 20 }, cardTitle: { color: '#F8F4FC', fontSize: 18, fontWeight: '700' }, cardText: { color: '#E9DDF5', fontSize: 14, lineHeight: 22 }, message: { color: '#F7D68D', fontSize: 14, lineHeight: 20 }, setupText: { color: '#D9CBE8', fontSize: 14, lineHeight: 20 }, primaryLink: { backgroundColor: '#FF8C3A', borderRadius: 14, color: '#1A1023', fontSize: 16, fontWeight: '800', overflow: 'hidden', padding: 16, textAlign: 'center' }, purchaseButton: { backgroundColor: '#FF8C3A', borderRadius: 14, padding: 16 }, purchaseText: { color: '#1A1023', fontSize: 16, fontWeight: '800', textAlign: 'center' }, restoreButton: { alignItems: 'center', borderColor: '#A96EE8', borderRadius: 14, borderWidth: 1, padding: 14 }, restoreText: { color: '#E9D3FF', fontSize: 15, fontWeight: '800' }, buttonDisabled: { opacity: 0.46 },
});

function getPurchaseBlockMessage(reason: NonNullable<ReturnType<typeof getCandyFinderPlusPurchaseBlockReason>>) {
  switch (reason) {
    case 'not_signed_in': return 'Sign in to purchase Candy Finder+.';
    case 'identity_syncing': return 'Candy Finder+ is still connecting to this account. Please try again.';
    case 'season_ended': return `New purchases ended at ${CANDY_FINDER_PLUS_2026_PURCHASE_CUTOFF_LABEL}.`;
    case 'offering_unavailable': return 'The 2026 Halloween Pass is not available from the App Store yet.';
  }
}
