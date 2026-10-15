import DateTimePicker from '@react-native-community/datetimepicker';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { formatDate, fromISODate, toISODate } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const theme = useTheme();
  if (!scroll) {
    return <View style={[styles.screen, { backgroundColor: theme.background }]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.heading, { color: theme.text }]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  const theme = useTheme();
  return <Text style={[styles.muted, { color: theme.textSecondary }, style]}>{children}</Text>;
}

export function Body({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: object;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Text style={[styles.body, { color: theme.text }, style]} onPress={onPress} suppressHighlighting={!onPress}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>{children}</View>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Heading>{title}</Heading>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
}) {
  const theme = useTheme();
  const bg =
    variant === 'primary' ? theme.accent : variant === 'danger' ? 'transparent' : theme.backgroundSelected;
  const fg =
    variant === 'primary' ? theme.onAccent : variant === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
        variant === 'danger' && { borderWidth: 1, borderColor: theme.danger },
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...input}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
          input.multiline && styles.inputMultiline,
        ]}
      />
      {hint ? <Muted>{hint}</Muted> : null}
    </View>
  );
}

export function NumberField(props: TextInputProps & { label: string; hint?: string }) {
  return <Field keyboardType="decimal-pad" {...props} />;
}

type Option<T> = { value: T; label: string };

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.background,
          borderColor: selected ? theme.accent : theme.border,
        },
      ]}>
      <Text style={[styles.chipText, { color: selected ? theme.onAccent : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
  allowClear,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  allowClear?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip
            key={String(o.value)}
            label={o.label}
            selected={o.value === value}
            onPress={() => onChange(allowClear && o.value === value ? null : o.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function MultiChipSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = value.includes(o.value);
          return (
            <Chip
              key={String(o.value)}
              label={o.label}
              selected={selected}
              onPress={() =>
                onChange(selected ? value.filter((v) => v !== o.value) : [...value, o.value])
              }
            />
          );
        })}
      </View>
    </View>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.field, styles.toggleRow]}>
      <Text style={[styles.body, { color: theme.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent }} />
    </View>
  );
}

// A date stored as YYYY-MM-DD. Optional dates can be cleared.
export function DateField({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  optional?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = value ? fromISODate(value) : new Date();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={[styles.input, styles.dateButton, { borderColor: theme.border }]}>
          <Text style={{ color: value ? theme.text : theme.textSecondary, fontSize: 16 }}>
            {value ? formatDate(value) : 'Not set'}
          </Text>
        </Pressable>
        {optional && value ? (
          <Button title="Clear" variant="secondary" small onPress={() => onChange(null)} />
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={current}
          mode="date"
          maximumDate={new Date(2100, 0, 1)}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onValueChange={(_e, date) => {
            if (Platform.OS !== 'ios') setOpen(false);
            onChange(toISODate(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Button title="Done" variant="secondary" small onPress={() => setOpen(false)} />
      ) : null}
    </View>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  const theme = useTheme();
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.listRow,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 },
      ]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.listTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.muted, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.accent} />
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  const theme = useTheme();
  if (!message) return null;
  return <Text style={[styles.body, { color: theme.danger }]}>{message}</Text>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center' }}>
      <Muted style={{ textAlign: 'center' }}>{children}</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 20, fontWeight: '700' },
  muted: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 16, lineHeight: 22 },
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  section: { gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: Spacing.two + 4 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  buttonTextSmall: { fontSize: 14 },
  field: { gap: Spacing.one + 2 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 46,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 14, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dateButton: { flex: 1, justifyContent: 'center' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    padding: Spacing.three,
  },
  listTitle: { fontSize: 16, fontWeight: '600' },
});
