import { SymbolView } from 'expo-symbols';
import { useSyncExternalStore } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { discardFailed, getSyncState, retryFailed, subscribeSync, syncNow } from '@/lib/offline';

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// Shows at the top of every screen while the phone is offline or has saves waiting to send.
export function SyncBanner() {
  const theme = useTheme();
  const { offline, pending, failed, syncing } = useSyncExternalStore(subscribeSync, getSyncState);

  if (failed.length > 0) {
    const showFailed = () =>
      Alert.alert(
        `${plural(failed.length, 'save')} couldn't be sent`,
        failed.map((f) => `${f.label}: ${f.error}`).join('\n\n'),
        [
          { text: 'Keep for now', style: 'cancel' },
          { text: 'Try again', onPress: () => void retryFailed() },
          { text: 'Discard', style: 'destructive', onPress: () => void discardFailed() },
        ],
      );
    return (
      <Banner
        icon={Icons.warning}
        color={theme.danger}
        text={`${plural(failed.length, 'save')} couldn't be sent. Tap to see why.`}
        onPress={showFailed}
      />
    );
  }
  if (pending.length > 0) {
    return (
      <Banner
        icon={Icons.waiting}
        color={theme.accent}
        text={
          syncing
            ? `Sending ${plural(pending.length, 'save')}…`
            : `${plural(pending.length, 'save')} kept on this phone. They'll send when you're back online.`
        }
        onPress={() => void syncNow()}
      />
    );
  }
  if (offline) {
    return <Banner icon={Icons.offline} color={theme.textSecondary} text="You're offline. Showing what's saved on this phone." />;
  }
  return null;
}

function Banner({
  icon,
  color,
  text,
  onPress,
}: {
  icon: (typeof Icons)[keyof typeof Icons];
  color: string;
  text: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: theme.backgroundElement, borderColor: color, opacity: pressed ? 0.7 : 1 },
      ]}>
      <SymbolView name={icon} size={18} tintColor={color} />
      <Text style={[styles.text, { color: theme.text }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  text: { flex: 1, fontSize: 14, lineHeight: 20 },
});
