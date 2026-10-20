import { describe, expect, test } from 'bun:test';

import { certificateHtml, scoreText, showEntryListHtml, toCsv } from '@/lib/export';

import { makeEntry, makeEvaluation, makeFish, makeProfile } from './fixtures';

describe('toCsv', () => {
  test('starts with a byte-order mark and ends rows with CRLF', () => {
    expect(toCsv(['A', 'B'], [[1, 'x']])).toBe('﻿A,B\r\n1,x\r\n');
  });

  test('quotes commas, quotes and line breaks, doubling inner quotes', () => {
    const csv = toCsv(['Notes'], [['a, b'], ['say "hi"'], ['line1\nline2']]);
    expect(csv).toBe('﻿Notes\r\n"a, b"\r\n"say ""hi"""\r\n"line1\nline2"\r\n');
  });

  test('blanks null and undefined, keeps numbers and booleans', () => {
    expect(toCsv(['a', 'b', 'c', 'd'], [[null, undefined, -5, true]])).toBe('﻿a,b,c,d\r\n,,-5,true\r\n');
  });

  test('guards text that a spreadsheet would run as a formula', () => {
    expect(toCsv(['x'], [['=SUM(A1)'], ['+1'], ['-2'], ['@cmd']])).toBe("﻿x\r\n'=SUM(A1)\r\n'+1\r\n'-2\r\n'@cmd\r\n");
    expect(toCsv(['x'], [['=1,2']])).toBe(`﻿x\r\n"'=1,2"\r\n`);
  });
});

describe('scoreText', () => {
  const scores = [
    { id: 'e1', sex: 'M' as const, total: 86.5 },
    { id: 'e2', sex: 'F' as const, total: 8 },
  ];

  test('shows the linked evaluation out of its maximum', () => {
    expect(scoreText(makeEntry({ evaluation_id: 'e1' }), scores)).toBe('86.5 / 100');
    expect(scoreText(makeEntry({ evaluation_id: 'e2' }), scores)).toBe('8 / 10');
  });

  test('is blank without a linked or known evaluation', () => {
    expect(scoreText(makeEntry({ evaluation_id: null }), scores)).toBe('');
    expect(scoreText(makeEntry({ evaluation_id: 'gone' }), scores)).toBe('');
  });
});

describe('showEntryListHtml', () => {
  const show = { show_name: 'Trans Canada', shown_on: '2026-05-10' };
  const fish = [makeFish({ id: 'f1', fish_code: 'GT-001' }), makeFish({ id: 'f2', fish_code: 'GT-002' })];

  test('lists the show’s entries with IHS score and starred estimated points', () => {
    const entries = [
      makeEntry({ fish_id: 'f1', ...show, evaluation_id: 'e1', placement: '2nd', points: null }),
      makeEntry({ fish_id: 'f2', ...show, placement: '1st', points: 12 }),
      makeEntry({ fish_id: 'f2', show_name: 'Other show', shown_on: '2026-05-10', placement: '1st' }),
    ];
    const html = showEntryListHtml(show, entries, fish, makeProfile(), [{ id: 'e1', sex: 'M', total: 86.5 }]);
    expect(html).toContain('<h1>Trans Canada</h1>');
    expect(html).toContain('2 entries');
    expect(html).toContain('<td>86.5 / 100</td>');
    expect(html).toContain('<td>8*</td>');
    expect(html).toContain('<td>12</td>');
    expect(html).toContain('* Points from placing');
    expect(html).toContain('Entered by Sam Breeder (SB)');
    expect(html).not.toContain('Other show');
  });

  test('has no footnote when no points were estimated, and escapes names', () => {
    const named = { show_name: 'Fish & <Friends>', shown_on: '2026-05-10' };
    const html = showEntryListHtml(named, [makeEntry({ fish_id: 'f1', ...named, placement: '1st', points: 10 })], fish, null);
    expect(html).toContain('Fish &amp; &lt;Friends&gt;');
    expect(html).toContain('1 entry');
    expect(html).not.toContain('* Points from placing');
  });
});

describe('certificateHtml', () => {
  const sire = makeFish({ id: 's', fish_code: 'SIRE-1' });
  const dam = makeFish({ id: 'd', fish_code: 'DAM-1', sex: 'F' });
  const fish = makeFish({ id: 'f', fish_code: 'GT-010', sire_id: 's', dam_id: 'd' });

  test('prints the pedigree without certificate pages when none are given', () => {
    const html = certificateHtml(fish, [fish, sire, dam], makeProfile());
    expect(html).toContain('Pedigree certificate');
    expect(html).toContain('SIRE-1');
    expect(html).toContain('DAM-1');
    expect(html).toContain('Sire unknown');
    expect(html).not.toContain('Official certificate');
    expect(html).not.toContain('page-break-before');
  });

  test('adds one page per official certificate, escaping the caption', () => {
    const html = certificateHtml(fish, [fish, sire, dam], null, {
      certificates: [
        { image: 'data:image/jpeg;base64,AAA', caption: 'Trans Canada <2026>' },
        { image: 'data:image/jpeg;base64,BBB', caption: 'Spring' },
      ],
    });
    expect(html.match(/Official certificate/g)).toHaveLength(2);
    expect(html).toContain('Trans Canada &lt;2026&gt;');
    expect(html).toContain('data:image/jpeg;base64,BBB');
  });

  test('shows the best IHS score with how it was judged', () => {
    const best = makeEvaluation({ total: 86.5, sex: 'M', kind: 'official', event: 'Trans Canada', evaluated_on: '2026-05-10', locked_at: '2026-05-10T12:00:00Z', judge: 'J. Doe', seal: 'ABC123' });
    const html = certificateHtml(fish, [fish, sire, dam], null, { best });
    expect(html).toContain('86.5 of 100, Official show result, Trans Canada, 10 May 2026, IHS 2023, signed by J. Doe, seal ABC123');
  });
});
