import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { ProfileForm } from '@/components/profile-form';
import { Button, Heading, Muted, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { useAuth } from '@/lib/auth';
import { disableNotifications, enableNotifications, notificationsEnabled } from '@/lib/notifications';
import { getSyncState } from '@/lib/offline';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { session } = useAuth();
  const [notifyOn, setNotifyOn] = useState<boolean | null>(null);
  useEffect(() => {
    notificationsEnabled().then(setNotifyOn);
  }, []);

  // The notifications themselves are scheduled from the reminder list each time Home loads.
  async function toggleNotifications() {
    if (notifyOn) {
      await disableNotifications();
      setNotifyOn(false);
      return;
    }
    const granted = await enableNotifications();
    setNotifyOn(granted);
    if (!granted) {
      Alert.alert(
        'Notifications are off',
        "Turn on notifications for Guppy Tracker in your phone's Settings to get morning reminders.",
      );
    }
  }

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
      <Heading>Morning reminders</Heading>
      <Muted>
        {notifyOn ? 'On: a notification at 9 am on days something is due.' : 'Off. Turn on to get a notification at 9 am on days something is due.'}
      </Muted>
      {notifyOn !== null ? (
        <Button
          title={notifyOn ? 'Turn off morning reminders' : 'Turn on morning reminders'}
          icon={Icons.reminder}
          variant="secondary"
          onPress={toggleNotifications}
        />
      ) : null}
      <ProfileForm onSaved={() => router.back()} />
      <Button title="Sign out" variant="danger" onPress={signOut} />
    </Screen>
  );
}
