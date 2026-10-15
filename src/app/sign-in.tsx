import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, ErrorText, Field, Heading, Muted, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    const creds = { email: email.trim(), password };
    const { data, error: err } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp(creds);
    setBusy(false);
    if (err) {
      setError(err.message);
    } else if (mode === 'sign-up' && !data.session) {
      Alert.alert('Check your email', 'Open the link we sent you to confirm your account, then sign in.');
      setMode('sign-in');
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (err) setError(err.message);
    else Alert.alert('Check your email', 'We sent you a link to reset your password.');
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen>
          <View style={styles.hero}>
            <Heading>Guppy Tracker</Heading>
            <Muted>Tanks, fish, spawns and pedigrees for show guppy breeders.</Muted>
          </View>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          />
          <ErrorText message={error} />
          <Button
            title={mode === 'sign-in' ? 'Sign in' : 'Create account'}
            onPress={submit}
            busy={busy}
          />
          <Button
            title={mode === 'sign-in' ? 'New here? Create an account' : 'Have an account? Sign in'}
            variant="secondary"
            onPress={() => {
              setError(null);
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            }}
          />
          {mode === 'sign-in' ? (
            <Button title="Forgot password" variant="secondary" small onPress={resetPassword} />
          ) : (
            <Body>Your data is private to your account. No one else can see your fish.</Body>
          )}
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.one, paddingTop: Spacing.five, paddingBottom: Spacing.three },
});
