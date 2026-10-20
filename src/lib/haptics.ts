import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small taps that confirm an action. They do nothing on web and never throw,
// so a phone without haptics (or with them turned off) just stays still.
function run(tap: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  try {
    tap().catch(() => {});
  } catch {}
}

// Something was saved.
export function saved() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

// A record was locked and signed, so it feels firmer than a save.
export function locked() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

// Something was deleted.
export function deleted() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

// A choice changed, like moving to the next body part.
export function selection() {
  run(() => Haptics.selectionAsync());
}
