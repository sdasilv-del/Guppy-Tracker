import { type Href, router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LineSpawn, LineTank } from '@/components/line-icons';
import { Button, Caps, Card, Empty, Heading, Icon, ListRow, LoadError, Muted, Screen, Section } from '@/components/ui';
import { type IconName, Icons } from '@/constants/icons';
import { Display, Spacing } from '@/constants/theme';
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

// One count in the row under the greeting: a serif numeral over a small capitals label, like the fish page score.
function Stat({ value, label, href, first }: { value: number | undefined; label: string; href: Href; first?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value ?? 'Loading'} ${label}`}
      onPress={() => router.navigate(href)}
      style={({ pressed }) => [
        styles.stat,
        !first && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.divider },
        { backgroundColor: pressed ? theme.backgroundElement : 'transparent' },
      ]}>
      <Text style={[styles.statNumber, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value ?? '–'}
      </Text>
      <Caps style={styles.statLabel}>{label}</Caps>
    </Pressable>
  );
}

const INSIGHT_ICONS: Record<InsightKind, IconName | ReactNode> = {
  water: Icons.waterTest,
  losses: Icons.warning,
  breeding: <LineSpawn />,
  inbreeding: Icons.pedigree,
  top: Icons.show,
  sales: Icons.sale,
  crowded: <LineTank />,
  records: Icons.edit,
};

function InsightRow({ insight: i }: { insight: Insight }) {
  const theme = useTheme();
  return (
    <ListRow
      icon={INSIGHT_ICONS[i.kind]}
      title={i.title}
      subtitle={i.detail}
      right={i.warn ? <Icon name={Icons.warning} size={18} color={theme.danger} /> : undefined}
      onPress={i.href ? () => router.push(i.href!) : undefined}
    />
  );
}

function InsightList({ title, insights }: { title: string; insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <Section title={title} caps>
      {insights.map((i) => (
        <InsightRow key={i.key} insight={i} />
      ))}
    </Section>
  );
}

// Insights fold into one card with the top few; "See all" opens the rest in place.
const INSIGHTS_SHOWN = 3;

function InsightCard({ insights }: { insights: Insight[] }) {
  const [open, setOpen] = useState(false);
  if (insights.length === 0) return null;
  const more = insights.length - INSIGHTS_SHOWN;
  return (
    <Section title="Insights" caps>
      <Card style={styles.insights}>
        {(open ? insights : insights.slice(0, INSIGHTS_SHOWN)).map((i) => (
          <InsightRow key={i.key} insight={i} />
        ))}
        {more > 0 ? (
          <Button
            title={open ? 'Show fewer' : `See all ${insights.length}`}
            variant="secondary"
            small
            onPress={() => setOpen(!open)}
          />
        ) : null}
      </Card>
    </Section>
  );
}

const REMINDER_ICONS: Record<ReminderKind, IconName | ReactNode> = {
  water_change: Icons.waterChange,
  sex_fry: <LineSpawn />,
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
        <Caps>Breeder initials {profile?.breeder_initials}</Caps>
      </View>

      {error ? <LoadError message={`Couldn't load your counts. ${error}`} onRetry={reload} /> : null}

      <View style={[styles.stats, { borderColor: theme.divider }]}>
        <Stat value={data?.tanks} label="Tanks" href="/tanks" first />
        <Stat value={data?.fish} label="Fish" href="/fish" />
        <Stat value={data?.fry} label="Fry" href="/breeding" />
        <Stat value={data?.forSale} label="For sale" href="/fish" />
      </View>

      <InsightList title="Needs attention" insights={data?.insights.filter((i) => i.warn) ?? []} />

      {data ? (
        <Section title="Today" caps>
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
        <Section title="Coming up" caps>
          {comingUp.map((r) => (
            <ReminderRow key={r.key} reminder={r} today={today} />
          ))}
        </Section>
      ) : null}

      <InsightCard insights={data?.insights.filter((i) => !i.warn) ?? []} />

      <Section title="More" caps>
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
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.one },
  // Four counts between hairlines, split by thin rules.
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.two, gap: 2 },
  statNumber: { fontFamily: Display.medium, fontSize: 34, lineHeight: 38, fontVariant: ['lining-nums', 'tabular-nums'] },
  statLabel: { fontSize: 10, letterSpacing: 1.2, textAlign: 'center' },
  insights: { paddingVertical: Spacing.one, gap: 0 },
  snooze: { paddingHorizontal: Spacing.one },
});
