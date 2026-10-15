import * as Print from 'expo-print';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Body, Button, Card, ErrorText, Heading, Loading, Muted, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { labelOf, TANK_PURPOSES } from '@/lib/constants';
import { getTank } from '@/lib/db';
import { tankLink } from '@/lib/qr';
import { useFocusData } from '@/lib/use-data';

type QRRef = { toDataURL: (cb: (base64: string) => void) => void };

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export default function TankQRScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tank, error } = useFocusData(() => getTank(id));
  const qrRef = useRef<QRRef | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  if (!tank && !error) return <Loading />;
  if (!tank) return <Screen><ErrorText message={error ?? 'Tank not found.'} /></Screen>;

  function printLabel() {
    setPrintError(null);
    qrRef.current?.toDataURL(async (base64) => {
      const title = escapeHtml(tank!.name ? `${tank!.tank_code} · ${tank!.name}` : tank!.tank_code);
      const purpose = escapeHtml(labelOf(TANK_PURPOSES, tank!.purpose));
      const html = `
        <html><body style="font-family: -apple-system, Roboto, sans-serif; text-align: center; padding: 24px;">
          <div style="display: inline-block; border: 1px solid #999; border-radius: 12px; padding: 16px 24px;">
            <img src="data:image/png;base64,${base64}" style="width: 180px; height: 180px;" />
            <div style="font-size: 22px; font-weight: 700; margin-top: 8px;">${title}</div>
            <div style="font-size: 14px; color: #555;">${purpose}</div>
          </div>
        </body></html>`;
      try {
        await Print.printAsync({ html });
      } catch (e) {
        setPrintError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <Screen>
      <Card style={styles.card}>
        <View style={styles.qr}>
          <QRCode
            value={tankLink(tank.id)}
            size={220}
            backgroundColor="#ffffff"
            color="#000000"
            getRef={(c) => (qrRef.current = c)}
          />
        </View>
        <Heading>{tank.tank_code}</Heading>
        {tank.name ? <Body>{tank.name}</Body> : null}
        <Muted>{labelOf(TANK_PURPOSES, tank.purpose)}</Muted>
      </Card>
      <Muted>
        Print this label and stick it on the tank. Scanning it from the home screen opens this tank.
      </Muted>
      <ErrorText message={printError} />
      <Button title="Print or save label" onPress={printLabel} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: Spacing.two },
  qr: { padding: Spacing.three, backgroundColor: '#ffffff', borderRadius: 12 },
});
