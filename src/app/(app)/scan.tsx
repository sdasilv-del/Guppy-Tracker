import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Body, Button, ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getTank } from '@/lib/db';
import { tankIdFromCode } from '@/lib/qr';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const handling = useRef(false);

  if (!permission) return <Loading />;

  if (!permission.granted) {
    return (
      <Screen>
        <Body>Guppy Tracker needs the camera to scan tank QR codes.</Body>
        <Button title="Allow camera" onPress={requestPermission} />
        {!permission.canAskAgain ? (
          <Muted>Camera access was turned off. Turn it on for Guppy Tracker in your phone settings.</Muted>
        ) : null}
      </Screen>
    );
  }

  async function onScanned(data: string) {
    if (handling.current) return;
    handling.current = true;
    const tankId = tankIdFromCode(data);
    if (!tankId) {
      setError('That QR code is not a Guppy Tracker tank label.');
      setTimeout(() => (handling.current = false), 1500);
      return;
    }
    try {
      const tank = await getTank(tankId);
      if (!tank) {
        setError('That tank is not in your account.');
        setTimeout(() => (handling.current = false), 1500);
        return;
      }
      router.replace({ pathname: '/tanks/[id]', params: { id: tank.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      handling.current = false;
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => onScanned(data)}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
      </View>
      <View style={styles.footer}>
        <ErrorText message={error} />
        <Muted style={styles.hint}>Point the camera at a tank label.</Muted>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: '#ffffff', borderRadius: 16 },
  footer: {
    position: 'absolute',
    bottom: Spacing.six,
    left: Spacing.three,
    right: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: Spacing.three,
  },
  hint: { color: '#ffffff' },
});
