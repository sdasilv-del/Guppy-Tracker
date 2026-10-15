// Dates are stored as YYYY-MM-DD strings (Postgres `date`) so they never shift with time zones.

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(s: string | null | undefined): string {
  if (!s) return '';
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// Age in weeks or months from a date of birth.
export function formatAge(dob: string | null): string {
  if (!dob) return '';
  const days = Math.floor((Date.now() - fromISODate(dob).getTime()) / 86_400_000);
  if (days < 0) return '';
  if (days < 70) return `${Math.floor(days / 7)} wk`;
  return `${Math.floor(days / 30.44)} mo`;
}

// Parses a form field into a number, or null when blank. Accepts a comma decimal.
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function numberText(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : String(n);
}

export function blankToNull(text: string): string | null {
  const t = text.trim();
  return t === '' ? null : t;
}
