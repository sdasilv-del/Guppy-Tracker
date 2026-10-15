import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Body, Button, Card, Heading, Muted, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { INACTIVE_STATUSES } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { listFish, listTanks } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { data } = useFocusData(async () => {
    const [tanks, fish] = await Promise.all([listTanks(), listFish()]);
    return {
      tanks: tanks.length,
      fish: fish.filter((f) => !INACTIVE_STATUSES.includes(f.status)).length,
      forSale: fish.filter((f) => f.status === 'for_sale').length,
    };
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Heading>Hello{profile?.display_name ? `, ${profile.display_name}` : ''}</Heading>
        <Muted>Breeder initials {profile?.breeder_initials}</Muted>
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Body style={styles.statNumber}>{data?.tanks ?? '–'}</Body>
          <Muted>Tanks</Muted>
        </Card>
        <Card style={styles.stat}>
          <Body style={styles.statNumber}>{data?.fish ?? '–'}</Body>
          <Muted>Fish</Muted>
        </Card>
        <Card style={styles.stat}>
          <Body style={styles.statNumber}>{data?.forSale ?? '–'}</Body>
          <Muted>For sale</Muted>
        </Card>
      </View>

      <Button title="Scan a tank QR code" onPress={() => router.push('/scan')} />
      <Button title="Tanks" variant="secondary" onPress={() => router.push('/tanks')} />
      <Button title="Fish" variant="secondary" onPress={() => router.push('/fish')} />
      <Button title="Profile" variant="secondary" onPress={() => router.push('/profile')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.one },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, alignItems: 'center', gap: 0 },
  statNumber: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
});
