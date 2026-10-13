import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';

import { useAuth } from '@/features/auth/providers/auth-provider';
import { supabase } from '@/services/supabase/client';

type AuthMode = 'signIn' | 'signUp';

const INITIAL_MESSAGE = 'Sign in to list and manage your house. The map remains open to everyone.';

export function AuthForm() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [message, setMessage] = useState(INITIAL_MESSAGE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setMessage('Enter your email address and password to continue.');
      return;
    }

    if (mode === 'signUp' && password.length < 8) {
      setMessage('Choose a password with at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        router.replace('/');
        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!session) {
        setMessage('Check your inbox to confirm your email, then sign in.');
        return;
      }

      router.replace('/');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((currentMode) => (currentMode === 'signIn' ? 'signUp' : 'signIn'));
    setMessage(INITIAL_MESSAGE);
  };

  const isSignUp = mode === 'signUp';

  const signOut = async () => {
    setIsSubmitting(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace('/');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>HOMEOWNER ACCESS</Text>
          <Text style={styles.heading}>You’re signed in</Text>
          <Text style={styles.description}>{session.user.email}</Text>
          {message && message !== INITIAL_MESSAGE ? (
            <Text style={styles.errorMessage}>{message}</Text>
          ) : null}
          <Link href="../list-house" style={styles.listHouseLink}>
            List your house
          </Link>
          <Pressable
            accessibilityLabel="Sign out"
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => void signOut()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !isSubmitting ? styles.secondaryButtonPressed : null,
              isSubmitting ? styles.buttonDisabled : null,
            ]}
          >
            {isSubmitting ? <ActivityIndicator color="#F8F4FC" /> : null}
            <Text style={[styles.secondaryButtonText, isSubmitting ? styles.buttonTextLoading : null]}>
              {isSubmitting ? 'Signing out…' : 'Sign out'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoidingView}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>HOMEOWNER ACCESS</Text>
        <Text style={styles.heading}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
        <Text style={styles.description}>{message}</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          accessibilityLabel="Email address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#BEB1CD"
          style={styles.input}
          textContentType="emailAddress"
          value={email}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          autoCorrect={false}
          onChangeText={setPassword}
          placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
          placeholderTextColor="#BEB1CD"
          secureTextEntry
          style={styles.input}
          textContentType={isSignUp ? 'newPassword' : 'password'}
          value={password}
        />

        <Pressable
          accessibilityLabel={isSignUp ? 'Create account' : 'Sign in'}
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !isSubmitting ? styles.primaryButtonPressed : null,
            isSubmitting ? styles.buttonDisabled : null,
          ]}
        >
          {isSubmitting ? <ActivityIndicator color="#15101F" /> : null}
          <Text style={[styles.primaryButtonText, isSubmitting ? styles.buttonTextLoading : null]}>
            {isSubmitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </Text>
        </Pressable>

        <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={switchMode}>
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(24, 15, 36, 0.97)',
    borderColor: 'rgba(155, 97, 201, 0.58)',
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  eyebrow: {
    color: '#FFAA4D',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heading: {
    color: '#F8F4FC',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 6,
  },
  description: {
    color: '#E9DDF5',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 22,
    marginTop: 8,
  },
  errorMessage: {
    color: '#F8C7C7',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
  },
  label: {
    color: '#F8F4FC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#342345',
    borderColor: 'rgba(202, 172, 230, 0.58)',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F8F4FC',
    fontSize: 16,
    marginBottom: 18,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#FF9E3D',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonPressed: {
    backgroundColor: '#E78328',
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#15101F',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#D9B8FF',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  listHouseLink: {
    backgroundColor: '#FF9E3D',
    borderRadius: 14,
    color: '#15101F',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    textAlign: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(217, 184, 255, 0.16)',
  },
  secondaryButtonText: {
    color: '#F8F4FC',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonTextLoading: {
    marginLeft: 8,
  },
  switchText: {
    color: '#D9B8FF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
});
