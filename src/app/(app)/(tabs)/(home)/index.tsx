import { type Href, router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Body, Button, Card, Empty, Heading, Icon, ListRow, LoadError, Muted, Screen, Section } from '@/components/ui';
import { type IconName, Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { INACTIVE_STATUSES } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { lastWaterChangeByTank, listFish, listSpawnEvents, listSpawns, listTanks } from '@/lib/db';
import { todayISO } from '@/lib/format';
import {
  disableNotifications,
  enableNotifications,
  notificationsEnabled,
  scheduleReminderNotifications,
} from '@/lib/notifications';
import { buildReminders, daysBetween, dueLabel, type Reminder, type ReminderKind } from '@/lib/reminders';
import { summarizeBatch } from '@/lib/spawn';
import { useFocusData } from '@/lib/use-data';
import { useTheme } from '@/hooks/use-theme';

function Stat({ value, label, href, icon }: { value: number | undefined; label: string; href: Href; icon: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value ?? 'Loading'} ${label}`}
      onPress={() => router.navigate(href)}
      style={({ pressed }) => [styles.statWrap, { opacity: pressed ? 0.75 : 1 }]}>
      <Card style={styles.stat}>
        <Icon name={icon} size={22} />
        <Body style={styles.statNumber}>{value ?? '–'}</Body>
        <Muted>{label}</Muted>
      </Card>
    </Pressable>
  );
}

const REMINDER_ICONS: Record<ReminderKind, IconName> = {
  water_change: Icons.waterChange,
  sex_fry: Icons.fish,
  separate_males: Icons.move,
};

// Show what's due or overdue, then the next week, so the list stays short.
const COMING_UP_DAYS = 7;

function ReminderRow({ reminder, today }: { reminder: Reminder; today: string }) {
  return (
    <ListRow
      icon={REMINDER_ICONS[reminder.kind]}
      title={reminder.title}
      subtitle={dueLabel(reminder.due, today)}
      onPress={() => router.push(reminder.href)}
    />
  );
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const { data, error, reload } = useFocusData(async () => {
    const [tanks, fish, spawns, events, lastWaterChange] = await Promise.all([
      listTanks(),
      listFish(),
      listSpawns(),
      listSpawnEvents(),
      lastWaterChangeByTank(),
    ]);
    const today = todayISO();
    const reminders = buildReminders({ tanks, lastWaterChange, spawns, events, fish, today });
    scheduleReminderNotifications(reminders).catch(() => {});
    return {
      today,
      reminders,
      hasSchedules: tanks.some((t) => t.water_change_every_days),
      tanks: tanks.length,
      fish: fish.filter((f) => !INACTIVE_STATUSES.includes(f.status)).length,
      fry: spawns.reduce((sum, s) => sum + summarizeBatch(s, events, fish).remaining, 0),
      forSale: fish.filter((f) => f.status === 'for_sale').length,
    };
  });

  const [notifyOn, setNotifyOn] = useState<boolean | null>(null);
  useEffect(() => {
    notificationsEnabled().then(setNotifyOn);
  }, []);

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
        'Turn on notifications for Guppy Tracker in your phone\'s Settings to get morning reminders.',
      );
      return;
    }
    if (data) await scheduleReminderNotifications(data.reminders);
  }

  const today = data?.today ?? todayISO();
  const due = data?.reminders.filter((r) => r.due <= today) ?? [];
  const comingUp = data?.reminders.filter((r) => r.due > today && daysBetween(today, r.due) <= COMING_UP_DAYS) ?? [];

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              hitSlop={10}
              onPress={() => router.push('/profile')}>
              <SymbolView
                name={{ ios: 'person.crop.circle', android: 'account_circle' }}
                size={28}
                tintColor={theme.accent}
              />
            </Pressable>
          ),
        }}
      />
      <View style={styles.header}>
        <Heading>Hello{profile?.display_name ? `, ${profile.display_name}` : ''}</Heading>
        <Muted>Breeder initials {profile?.breeder_initials}</Muted>
      </View>

      {error ? <LoadError message={`Couldn't load your counts. ${error}`} onRetry={reload} /> : null}

      <View style={styles.stats}>
        <Stat value={data?.tanks} label="Tanks" href="/tanks" icon={Icons.tank} />
        <Stat value={data?.fish} label="Fish" href="/fish" icon={Icons.fish} />
        <Stat value={data?.fry} label="Fry" href="/breeding" icon={Icons.spawn} />
        <Stat value={data?.forSale} label="For sale" href="/fish" icon={{ ios: 'tag', android: 'sell' }} />
      </View>

      {data ? (
        <Section title="Today">
          {due.length === 0 ? <Empty>Nothing due today.</Empty> : null}
          {due.map((r) => (
            <ReminderRow key={r.key} reminder={r} today={today} />
          ))}
          {!data.hasSchedules ? (
            <Muted>Set a water change schedule on a tank to get reminders for it.</Muted>
          ) : null}
        </Section>
      ) : null}

      {comingUp.length > 0 ? (
        <Section title="Coming up">
          {comingUp.map((r) => (
            <ReminderRow key={r.key} reminder={r} today={today} />
          ))}
        </Section>
      ) : null}

      {data && notifyOn !== null ? (
        <Button
          title={notifyOn ? 'Turn off morning reminders' : 'Remind me each morning'}
          icon={Icons.reminder}
          variant="secondary"
          onPress={toggleNotifications}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.one },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // Two counts per row, so labels like "For sale" never squeeze or wrap.
  statWrap: { flexBasis: '47%', flexGrow: 1 },
  stat: { alignItems: 'center', gap: 0 },
  statNumber: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
});
