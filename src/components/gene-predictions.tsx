import { Body, Card, Muted } from '@/components/ui';
import type { Prediction } from '@/lib/genetics';

// What a pair's fry should show for each tracked gene.
export function GenePredictions({ predictions, title = 'Colour genes in the fry' }: { predictions: Prediction[]; title?: string }) {
  if (predictions.length === 0) return null;
  const known = predictions.filter((p) => p.missing.length === 0);
  const unknown = predictions.filter((p) => p.missing.length > 0);
  return (
    <Card>
      <Body style={{ fontWeight: '600' }}>{title}</Body>
      {known.map((p) => (
        <Body key={p.gene.id}>{`${p.gene.name}: ${p.lines.join(' ')}`}</Body>
      ))}
      {unknown.map((p) => (
        <Muted key={p.gene.id}>{`${p.gene.name}: record it on ${p.missing.join(' and ')} to predict.`}</Muted>
      ))}
      {known.length > 0 ? <Muted>Odds for each fry. A real spawn can differ, more so when it is small.</Muted> : null}
    </Card>
  );
}
