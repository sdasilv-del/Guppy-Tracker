import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ErrorText, Field } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { createTrait } from '@/lib/db';
import type { Trait } from '@/lib/types';

// Adds a trait to the account's list, or finds the existing one with the same name.
export function NewTraitField({ traits, onAdded }: { traits: Trait[]; onAdded: (trait: Trait, isNew: boolean) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    const existing = traits.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    try {
      if (existing) onAdded(existing, false);
      else onAdded(await createTrait(trimmed), true);
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="New trait" value={name} onChangeText={setName} placeholder="e.g. Dorsal length" />
        </View>
        <Button title="Add" variant="secondary" small onPress={add} />
      </View>
      <ErrorText message={error} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
});
