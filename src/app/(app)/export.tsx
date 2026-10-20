import { useState } from 'react';

import { Button, ChipSelect, Empty, ErrorText, Loading, Muted, Screen, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { useAuth } from '@/lib/auth';
import { listAllShowEntries, listAllWaterTests, listFish, listSales, listTanks } from '@/lib/db';
import { fishCsv, listShows, salesCsv, showEntryListHtml, showsCsv, waterTestsCsv } from '@/lib/export';
import { formatDate } from '@/lib/format';
import { printHtml, shareCsv } from '@/lib/share';
import { useFocusData } from '@/lib/use-data';

type Job = 'fish' | 'sales' | 'shows' | 'water' | 'show-list';

export default function ExportScreen() {
  const { profile } = useAuth();
  const { data, error } = useFocusData(async () => {
    const [fish, tanks, entries] = await Promise.all([listFish(), listTanks(), listAllShowEntries()]);
    return { fish, tanks, entries, shows: listShows(entries) };
  });
  const [busy, setBusy] = useState<Job | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [showIndex, setShowIndex] = useState<number | null>(0);

  if (!data && !error) return <Loading />;
  if (!data) return <Screen><ErrorText message={error} /></Screen>;

  async function run(job: Job, work: () => Promise<void>) {
    setBusy(job);
    setJobError(null);
    try {
      await work();
    } catch (e) {
      setJobError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const { fish, tanks, entries, shows } = data;
  const show = showIndex !== null ? shows[showIndex] : undefined;

  return (
    <Screen>
      <Section title="Spreadsheets">
        <Muted>Each one opens the share sheet, so you can email it, save it to Files or Drive, or open it in Excel or Sheets.</Muted>
        <Button
          title={`Fish (${fish.length})`}
          icon={Icons.export}
          variant="secondary"
          busy={busy === 'fish'}
          onPress={() => run('fish', () => shareCsv('fish', fishCsv(fish, tanks)))}
        />
        <Button
          title="Sales"
          icon={Icons.export}
          variant="secondary"
          busy={busy === 'sales'}
          onPress={() => run('sales', async () => shareCsv('sales', salesCsv(await listSales(), fish)))}
        />
        <Button
          title={`Show results (${entries.length})`}
          icon={Icons.export}
          variant="secondary"
          busy={busy === 'shows'}
          onPress={() => run('shows', () => shareCsv('shows', showsCsv(entries, fish)))}
        />
        <Button
          title="Water tests"
          icon={Icons.export}
          variant="secondary"
          busy={busy === 'water'}
          onPress={() => run('water', async () => shareCsv('water-tests', waterTestsCsv(await listAllWaterTests(), tanks)))}
        />
      </Section>

      <Section title="Show entry list">
        {shows.length === 0 ? (
          <Empty>No show entries yet. Add one from a fish&apos;s page, then print the list here.</Empty>
        ) : (
          <>
            <ChipSelect
              label="Show"
              options={shows.slice(0, 12).map((s, i) => ({ value: i, label: `${s.show_name}, ${formatDate(s.shown_on)}` }))}
              value={showIndex}
              onChange={setShowIndex}
            />
            <Button
              title="Print entry list"
              icon={Icons.print}
              disabled={!show}
              busy={busy === 'show-list'}
              onPress={() => run('show-list', () => printHtml(showEntryListHtml(show!, entries, fish, profile)))}
            />
            <Muted>Every fish entered in that show, with class, tail and colours. Print it or save it as a PDF.</Muted>
          </>
        )}
      </Section>

      <Muted>To print a pedigree certificate for a buyer, open a fish, then its pedigree.</Muted>
      <ErrorText message={jobError} />
    </Screen>
  );
}
