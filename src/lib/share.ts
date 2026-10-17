import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { todayISO } from '@/lib/format';

// Saves a spreadsheet to the phone and opens the share sheet, so it can go to email, Files, Drive or a computer.
export async function shareCsv(name: string, csv: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device.");
  const file = new File(Paths.cache, `guppy-${name}-${todayISO()}.csv`);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Share spreadsheet',
  });
}

// Opens the print dialog, which also offers Save as PDF.
export async function printHtml(html: string) {
  await Print.printAsync({ html });
}
