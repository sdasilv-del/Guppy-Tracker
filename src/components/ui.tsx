import DateTimePicker from '@react-native-community/datetimepicker';
import { type ReactNode, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { SymbolView } from 'expo-symbols';

import { SyncBanner } from '@/components/sync-banner';
import { type IconName, Icons } from '@/constants/icons';
import { Display, Spacing } from '@/constants/theme';
import { formatDate, fromISODate, toISODate } from '@/lib/format';
import { clearReadCache } from '@/lib/offline';
import { useTheme } from '@/hooks/use-theme';

// Drag-down-to-reload for a screen, with the spinner shown until the reload finishes.
function useRefresh(onRefresh?: () => Promise<unknown>) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  if (!onRefresh) return undefined;
  return (
    <RefreshControl
      refreshing={refreshing}
      tintColor={theme.accent}
      colors={[theme.accent]}
      onRefresh={() => {
        setRefreshing(true);
        clearReadCache();
        onRefresh().finally(() => setRefreshing(false));
      }}
    />
  );
}

export function Screen({
  children,
  scroll = true,
  onRefresh,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => Promise<unknown>;
}) {
  const theme = useTheme();
  const refreshControl = useRefresh(onRefresh);
  if (!scroll) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <SyncBanner />
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      // Pads the content below the header and above the tab bar, so nothing slides underneath them.
      contentInsetAdjustmentBehavior="automatic"
      // Keeps the focused field above the keyboard; dragging the page down puts the keyboard away.
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      refreshControl={refreshControl}>
      <SyncBanner />
      {children}
    </ScrollView>
  );
}

// A screen that is mostly one long list. Only the rows on screen are drawn, so it stays quick with
// thousands of fish. Anything above the list (buttons, search, filters) goes in header.
export function ListScreen<T>({
  header,
  data,
  renderItem,
  keyExtractor,
  empty,
  onRefresh,
  extraData,
}: {
  header?: ReactNode;
  data: readonly T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  empty?: ReactNode;
  onRefresh?: () => Promise<unknown>;
  extraData?: unknown;
}) {
  const theme = useTheme();
  const refreshControl = useRefresh(onRefresh);
  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      extraData={extraData}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <SyncBanner />
          {header}
        </View>
      }
      ListEmptyComponent={empty ? <>{empty}</> : null}
      initialNumToRender={12}
      windowSize={7}
      refreshControl={refreshControl}
    />
  );
}

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const theme = useTheme();
  return <SymbolView name={name} size={size} tintColor={color ?? theme.accent} />;
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
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.divider }, style]}>
      {children}
    </View>
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
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  icon?: IconName;
}) {
  const theme = useTheme();
  const bg =
    variant === 'primary' ? theme.accent : 'transparent';
  const fg =
    variant === 'primary' ? theme.onAccent : variant === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
        variant !== 'primary' && { borderWidth: 1, borderColor: variant === 'danger' ? theme.danger : theme.border },
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// A text field. An error shows in red under it, e.g. a required field left empty, and is read out
// by screen readers as soon as it appears.
export function Field({
  label,
  hint,
  error,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const theme = useTheme();
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={label}
        accessibilityHint={hint}
        {...input}
        style={[
          styles.input,
          { color: theme.text, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.background },
          input.multiline && styles.inputMultiline,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.muted, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}
      {hint ? <Muted>{hint}</Muted> : null}
    </View>
  );
}

export function NumberField(props: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  return <Field keyboardType="decimal-pad" {...props} />;
}

// Delete and other for-good actions, kept at the bottom of an edit screen behind a thin line,
// away from Save, with a short note on what is lost.
export function DangerZone({ note, children }: { note: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.dangerZone, { borderTopColor: theme.divider }]}>
      <Muted>{note}</Muted>
      {children}
    </View>
  );
}

type Option<T> = { value: T; label: string };

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
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

// A row of tabs inside a screen, such as Overview, Scores, Family and History on a fish.
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.segments, { borderBottomColor: theme.divider }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { borderBottomColor: theme.accent }]}>
            <Text
              numberOfLines={1}
              style={[styles.segmentText, { color: selected ? theme.highlight : theme.textSecondary }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
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
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent }} accessibilityLabel={label} />
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
          accessibilityLabel={`${label}, ${value ? formatDate(value) : 'not set'}`}
          accessibilityHint="Opens a date picker"
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
    <View style={[styles.infoRow, { borderBottomColor: theme.divider }]}>
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
  icon,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  icon?: IconName;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.listRow,
        { backgroundColor: theme.backgroundElement, borderColor: theme.divider, opacity: pressed ? 0.75 : 1 },
      ]}>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: theme.backgroundSelected }]}>
          <Icon name={icon} size={18} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.listTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.muted, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress ? <Icon name={Icons.chevron} size={13} color={theme.textSecondary} /> : null}
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
  // Screen readers say the error out loud as soon as it appears.
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.body, { color: theme.danger }]}>
      {message}
    </Text>
  );
}

// A load that failed, with a way to try again instead of a spinner or blank screen.
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <ErrorText message={message} />
      <Button title="Try again" variant="secondary" onPress={onRetry} />
    </Card>
  );
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
  listHeader: { gap: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: Display.semibold, fontSize: 24, lineHeight: 28 },
  muted: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 16, lineHeight: 22 },
  card: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  section: { gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: {
    minHeight: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  buttonSmall: { minHeight: 44, paddingHorizontal: Spacing.two + 4 },
  buttonText: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.4 },
  buttonTextSmall: { fontSize: 12, letterSpacing: 1.2 },
  field: { gap: Spacing.one + 2 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.6 },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 46,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  dangerZone: {
    marginTop: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  segments: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.2 },
  chip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
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
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  listTitle: { fontSize: 16, fontWeight: '600' },
  listIcon: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
