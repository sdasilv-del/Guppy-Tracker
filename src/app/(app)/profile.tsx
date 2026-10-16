import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ProfileForm } from '@/components/profile-form';
import { Button, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getSyncState } from '@/lib/offline';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { session } = useAuth();

  function signOut() {
    const { pending, failed } = getSyncState();
    const unsent = pending.length + failed.length;
    if (unsent === 0) {
      supabase.auth.signOut();
      return;
    }
    Alert.alert(
      'Saves not sent yet',
      `${unsent} ${unsent === 1 ? 'save is' : 'saves are'} still on this phone. Signing out deletes ${unsent === 1 ? 'it' : 'them'}.`,
      [
        { text: 'Stay signed in', style: 'cancel' },
        { text: 'Sign out anyway', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ],
    );
  }

  return (
    <Screen>
      <Muted>Signed in as {session?.user.email}</Muted>
      <ProfileForm onSaved={() => router.back()} />
      <Button title="Sign out" variant="danger" onPress={signOut} />
    </Screen>
  );
}
