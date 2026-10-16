import { type Href, router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Card, Heading, Icon, LoadError, Muted, Screen } from '@/components/ui';
import { type IconName, Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { INACTIVE_STATUSES } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { listFish, listSpawnEvents, listSpawns, listTanks } from '@/lib/db';
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

export default function HomeScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const { data, error, reload } = useFocusData(async () => {
    const [tanks, fish, spawns, events] = await Promise.all([
      listTanks(),
      listFish(),
      listSpawns(),
      listSpawnEvents(),
    ]);
    return {
      tanks: tanks.length,
      fish: fish.filter((f) => !INACTIVE_STATUSES.includes(f.status)).length,
      fry: spawns.reduce((sum, s) => sum + summarizeBatch(s, events, fish).remaining, 0),
      forSale: fish.filter((f) => f.status === 'for_sale').length,
    };
  });

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
