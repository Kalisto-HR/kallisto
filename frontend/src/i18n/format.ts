import { getCurrentLocale } from "./index";

export function formatLocaleDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function formatLocalePercentage(value: number): string {
  return new Intl.NumberFormat(getCurrentLocale(), {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}
