const MONTHS = [
  "januar",
  "februar",
  "marts",
  "april",
  "maj",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "december",
];

export function formatInt(value: number): string {
  return new Intl.NumberFormat("da-DK").format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "ukendt dato";
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day}. ${MONTHS[month - 1]} ${year}`;
}

export function formatRate(value: number): string {
  const digits = value >= 100 || value === 0 ? 0 : 1;
  return new Intl.NumberFormat("da-DK", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function formatPercent(part: number, total: number): string {
  if (!total) return "0 %";
  const value = (part / total) * 100;
  const digits = value >= 10 || value === 0 ? 0 : 1;
  return `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)} %`;
}
