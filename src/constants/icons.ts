import type { SymbolViewProps } from 'expo-symbols';

export type IconName = SymbolViewProps['name'];

// One icon per kind of thing, so the same symbol means the same thing on every screen.
// iOS uses SF Symbols; Android uses Material Symbols.
export const Icons = {
  tank: { ios: 'square.grid.2x2', android: 'grid_view' },
  fish: { ios: 'fish', android: 'set_meal' },
  group: { ios: 'heart', android: 'favorite' },
  spawn: { ios: 'sparkles', android: 'auto_awesome' },
  waterTest: { ios: 'testtube.2', android: 'science' },
  waterChange: { ios: 'arrow.triangle.2.circlepath', android: 'autorenew' },
  feeding: { ios: 'fork.knife', android: 'restaurant' },
  treatment: { ios: 'cross.case', android: 'medical_services' },
  filter: { ios: 'line.3.horizontal.decrease.circle', android: 'filter_list' },
  trait: { ios: 'star', android: 'star' },
  evaluation: { ios: 'rosette', android: 'military_tech' },
  pedigree: { ios: 'point.3.connected.trianglepath.dotted', android: 'account_tree' },
  move: { ios: 'arrow.left.arrow.right', android: 'swap_horiz' },
  qr: { ios: 'qrcode', android: 'qr_code' },
  edit: { ios: 'pencil', android: 'edit' },
  add: { ios: 'plus', android: 'add' },
  camera: { ios: 'camera', android: 'photo_camera' },
  library: { ios: 'photo.on.rectangle', android: 'photo_library' },
  show: { ios: 'trophy', android: 'emoji_events' },
  sale: { ios: 'tag', android: 'sell' },
  strain: { ios: 'chart.bar.xaxis', android: 'bar_chart' },
  reminder: { ios: 'bell', android: 'notifications' },
  snooze: { ios: 'clock.arrow.circlepath', android: 'snooze' },
  done: { ios: 'checkmark.circle', android: 'check_circle' },
  offline: { ios: 'icloud.slash', android: 'cloud_off' },
  waiting: { ios: 'icloud.and.arrow.up', android: 'cloud_upload' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning' },
  print: { ios: 'printer', android: 'print' },
  export: { ios: 'square.and.arrow.up', android: 'ios_share' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
} satisfies Record<string, IconName>;
