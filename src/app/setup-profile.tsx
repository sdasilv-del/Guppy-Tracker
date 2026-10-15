import { ProfileForm } from '@/components/profile-form';
import { Button, Muted, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SetupProfileScreen() {
  return (
    <Screen>
      <Muted>Set up your breeder profile. Your initials start every fish ID you create.</Muted>
      <ProfileForm />
      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
