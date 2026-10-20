import { type Href, router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Button, Card, Empty, Heading, Icon, ListRow, LoadError, Muted, Screen, Section } from '@/components/ui';
import { type IconName, Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { INACTIVE_STATUSES } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import {
  fishIdsWithPhotos,
  groupMembers,
  lastWaterChangeByTank,
  listAllShowEntries,
  listAllWaterTests,
  listCustomReminders,
  listEvaluationSummariesSince,
  listFish,
  listGroups,
  listSales,
  listSnoozes,
  listSpawnEvents,
  listSpawns,
  listTanks,
} from '@/lib/db';
import { buildInsights, DEFAULT_INSIGHT_SETTINGS, type Insight, type InsightKind } from '@/lib/insights';
import { todayISO } from '@/lib/format';
import { scheduleReminderNotifications } from '@/lib/notifications';
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

const INSIGHT_ICONS: Record<InsightKind, IconName> = {
  water: Icons.waterTest,
  losses: Icons.warning,
  breeding: Icons.spawn,
  inbreeding: Icons.pedigree,
  top: Icons.show,
  sales: Icons.sale,
  crowded: Icons.tank,
  records: Icons.edit,
};

function InsightList({ title, insights }: { title: string; insights: Insight[] }) {
  const theme = useTheme();
  if (insights.length === 0) return null;
  return (
    <Section title={title}>
      {insights.map((i) => (
        <ListRow
          key={i.key}
          icon={INSIGHT_ICONS[i.kind]}
          title={i.title}
          subtitle={i.detail}
          right={i.warn ? <Icon name={Icons.warning} size={18} color={theme.danger} /> : undefined}
          onPress={i.href ? () => router.push(i.href!) : undefined}
        />
      ))}
    </Section>
  );
}

const REMINDER_ICONS: Record<ReminderKind, IconName> = {
  water_change: Icons.waterChange,
  sex_fry: Icons.fish,
  separate_males: Icons.move,
  custom: Icons.reminder,
};

// Show what's due or overdue, then the next week, so the list stays short.
const COMING_UP_DAYS = 7;

function ReminderRow({ reminder, today }: { reminder: Reminder; today: string }) {
  const theme = useTheme();
  return (
    <ListRow
      icon={REMINDER_ICONS[reminder.kind]}
      title={reminder.title}
      subtitle={`${dueLabel(reminder.due, today)}${reminder.snoozed ? ' · snoozed' : ''}`}
      onPress={() => router.push(reminder.href)}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reminder.customId ? `Snooze or mark done: ${reminder.title}` : `Snooze: ${reminder.title}`}
          hitSlop={10}
          onPress={() =>
            router.push({
              pathname: '/reminders/actions',
              params: {
                key: reminder.key,
                title: reminder.title,
                due: reminder.due,
                ...(reminder.customId ? { customId: reminder.customId } : {}),
              },
            })
          }
          style={({ pressed }) => [styles.snooze, { opacity: pressed ? 0.6 : 1 }]}>
          <Icon name={reminder.customId ? Icons.done : Icons.snooze} size={20} color={theme.accent} />
        </Pressable>
      }
    />
  );
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const { data, error, reload } = useFocusData(async () => {
    const [tanks, fish, spawns, events, lastWaterChange, custom, snoozes] = await Promise.all([
      listTanks(),
      listFish(),
      listSpawns(),
      listSpawnEvents(),
      lastWaterChangeByTank(),
      listCustomReminders(),
      listSnoozes(),
    ]);
    const today = todayISO();
    // Insights are extra: if any of these fail, Home still shows counts and reminders.
    const insights = await Promise.all([
      listAllWaterTests(),
      // Only this year's scores: the insight names the top fish of the season.
      listEvaluationSummariesSince(`${today.slice(0, 4)}-01-01`),
      listAllShowEntries(),
      listSales(),
      listGroups(),
      groupMembers(),
      fishIdsWithPhotos(),
    ])
      .then(([waterTests, evaluations, shows, sales, groups, members, withPhotos]) =>
        buildInsights({
          today,
          tanks,
          fish,
          spawns,
          events,
          waterTests,
          evaluations,
          shows,
          sales,
          groups,
          members,
          withPhotos,
          settings: profile ?? DEFAULT_INSIGHT_SETTINGS,
        }),
      )
      .catch(() => [] as Insight[]);
    const reminders = buildReminders({ tanks, lastWaterChange, spawns, events, fish, custom, snoozes, today });
    scheduleReminderNotifications(reminders).catch(() => {});
    return {
      today,
      insights,
      reminders,
      hasSchedules: tanks.some((t) => t.water_change_every_days),
      tanks: tanks.length,
      fish: fish.filter((f) => !INACTIVE_STATUSES.includes(f.status)).length,
      fry: spawns.reduce((sum, s) => sum + summarizeBatch(s, events, fish).remaining, 0),
      forSale: fish.filter((f) => f.status === 'for_sale').length,
    };
  });

  const today = data?.today ?? todayISO();
  const due = data?.reminders.filter((r) => r.due <= today) ?? [];
  const comingUp = data?.reminders.filter((r) => r.due > today && daysBetween(today, r.due) <= COMING_UP_DAYS) ?? [];

  return (
    <Screen onRefresh={reload}>
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

      <InsightList title="Needs attention" insights={data?.insights.filter((i) => i.warn) ?? []} />

      {data ? (
        <Section title="Today">
          {due.length === 0 ? <Empty>Nothing due today.</Empty> : null}
          {due.map((r) => (
            <ReminderRow key={r.key} reminder={r} today={today} />
          ))}
          {!data.hasSchedules ? (
            <Muted>Set a water change schedule on a tank to get reminders for it.</Muted>
          ) : null}
          <Button
            title="Add a reminder"
            icon={Icons.add}
            variant="secondary"
            small
            onPress={() => router.push('/reminders/edit')}
          />
        </Section>
      ) : null}

      {comingUp.length > 0 ? (
        <Section title="Coming up">
          {comingUp.map((r) => (
            <ReminderRow key={r.key} reminder={r} today={today} />
          ))}
        </Section>
      ) : null}

      <InsightList title="Insights" insights={data?.insights.filter((i) => !i.warn) ?? []} />

      <ListRow
        icon={Icons.show}
        title="Season points"
        subtitle="Show standings for each class"
        onPress={() => router.push('/points')}
      />
      <ListRow
        icon={Icons.export}
        title="Export and print"
        subtitle="Spreadsheets and show entry lists"
        onPress={() => router.push('/export')}
      />
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
  snooze: { paddingHorizontal: Spacing.one },
});
