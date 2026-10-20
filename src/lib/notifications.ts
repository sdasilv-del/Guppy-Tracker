import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { fromISODate, todayISO } from '@/lib/format';
import type { Reminder } from '@/lib/reminders';

// A morning notification on each day something is due. They're scheduled on the phone from the
// reminder list, so they work without a server, and are rebuilt each time the list is loaded.

const ENABLED_KEY = 'gt-reminder-notifications';
const CHANNEL_ID = 'reminders';
const NOTIFY_HOUR = 9;
const DAYS_AHEAD = 30;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function notificationsEnabled(): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(ENABLED_KEY)) !== 'on') return false;
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

// Asks for permission. Returns false if the person said no.
export async function enableNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13 only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return false;
  await AsyncStorage.setItem(ENABLED_KEY, 'on');
  return true;
}

export async function disableNotifications() {
  await AsyncStorage.removeItem(ENABLED_KEY);
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function summary(items: Reminder[]): string {
  const counts = { water_change: 0, sex_fry: 0, separate_males: 0, custom: 0 };
  for (const r of items) counts[r.kind]++;
  const parts = [
    counts.water_change ? `${counts.water_change} water change${counts.water_change === 1 ? '' : 's'}` : null,
    counts.sex_fry ? `${counts.sex_fry} batch${counts.sex_fry === 1 ? '' : 'es'} of fry to sex` : null,
    counts.separate_males
      ? `${counts.separate_males} batch${counts.separate_males === 1 ? '' : 'es'} to separate`
      : null,
    // One of your own reminders is named; several are counted.
    counts.custom === 1
      ? items.find((r) => r.kind === 'custom')!.title
      : counts.custom > 1
        ? `${counts.custom} of your own reminders`
        : null,
  ].filter(Boolean);
  return parts.join(', ');
}

// Replaces every scheduled reminder with one per due day, at 9am, for the next month.
export async function scheduleReminderNotifications(reminders: Reminder[]) {
  if (!(await notificationsEnabled())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const today = todayISO();
  const byDay = new Map<string, Reminder[]>();
  for (const r of reminders) {
    // Anything already overdue is announced with today's.
    const day = r.due < today ? today : r.due;
    byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }
  const now = Date.now();
  const last = now + DAYS_AHEAD * 86_400_000;
  for (const [day, items] of byDay) {
    const at = fromISODate(day);
    at.setHours(NOTIFY_HOUR, 0, 0, 0);
    if (at.getTime() <= now || at.getTime() > last) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: items.length === 1 ? items[0].title : `${items.length} things due in the fish room`,
        body: items.length === 1 ? 'Open Guppy Tracker to log it.' : summary(items),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: CHANNEL_ID,
      },
    });
  }
}
