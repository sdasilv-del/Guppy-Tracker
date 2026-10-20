import { describe, expect, test } from 'bun:test';

import { formatDate, formatTemp, fromDisplayTemp, fromISODate, parseNumber, toDisplayTemp, toISODate } from '@/lib/format';

describe('parseNumber', () => {
  test('parses numbers and comma decimals', () => {
    expect(parseNumber('7.2')).toBe(7.2);
    expect(parseNumber(' 3,5 ')).toBe(3.5);
    expect(parseNumber('-1')).toBe(-1);
  });

  test('returns null for blank or non-numeric text', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('   ')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('Infinity')).toBeNull();
  });
});

describe('dates', () => {
  test('formatDate gives day, short month and year, and ignores a time part', () => {
    expect(formatDate('2026-03-05')).toBe('5 Mar 2026');
    expect(formatDate('2026-12-31T23:59:00Z')).toBe('31 Dec 2026');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  test('toISODate and fromISODate round-trip without shifting the day', () => {
    for (const d of ['2026-01-01', '2026-03-08', '2026-11-01', '2028-02-29']) expect(toISODate(fromISODate(d))).toBe(d);
  });
});

describe('temperatures', () => {
  test('converts °C to the display unit, rounded to 0.1', () => {
    expect(toDisplayTemp(25, 'F')).toBe(77);
    expect(toDisplayTemp(26.66, 'F')).toBe(80);
    expect(toDisplayTemp(26.66, 'C')).toBe(26.7);
  });

  test('converts a typed value back to °C', () => {
    expect(fromDisplayTemp(77, 'F')).toBe(25);
    expect(fromDisplayTemp(80, 'F')).toBe(26.67);
    expect(fromDisplayTemp(26.5, 'C')).toBe(26.5);
  });

  test('formatTemp adds the unit and passes null through', () => {
    expect(formatTemp(26.5, 'C')).toBe('26.5 °C');
    expect(formatTemp(25, 'F')).toBe('77 °F');
    expect(formatTemp(null, 'F')).toBeNull();
  });
});
