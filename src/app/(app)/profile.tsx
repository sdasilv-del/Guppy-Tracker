import { router } from 'expo-router';

import { ProfileForm } from '@/components/profile-form';
import { Button, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { session } = useAuth();
  return (
    <Screen>
      <Muted>Signed in as {session?.user.email}</Muted>
      <ProfileForm onSaved={() => router.back()} />
      <Button title="Sign out" variant="danger" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
