import i18n, { getCurrentLocale } from "../i18n";

export interface CurrencyFormatOptions {
  fallback?: string;
  withUnit?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

function parseNumberValue(value: string): number | null {
  const normalized = value.replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumericRmb(amount: number, options: CurrencyFormatOptions): string {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });

  const display = `¥${formatter.format(amount)}`;
  return options.withUnit ? `${display} RMB` : display;
}

function replaceCurrencyTokens(value: string, withUnit: boolean): string {
  let next = value
    .replace(/USD/gi, "RMB")
    .replace(/US\$/gi, "¥")
    .replace(/\$/g, "¥");

  if (withUnit && !/RMB/i.test(next) && /¥/.test(next)) {
    next = `${next} RMB`;
  }

  return next;
}

export function formatRmb(value: number | string | null | undefined, options: CurrencyFormatOptions = {}): string {
  const fallback = options.fallback ?? "N/A";

  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "number") {
    return formatNumericRmb(value, options);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  const parsed = parseNumberValue(trimmed);
  if (parsed === null) {
    return replaceCurrencyTokens(trimmed, Boolean(options.withUnit));
  }

  return formatNumericRmb(parsed, options);
}

export function formatUzs(value: number | string | null | undefined, options: CurrencyFormatOptions = {}): string {
  const fallback = options.fallback ?? "N/A";
  if (value === null || value === undefined) {
    return fallback;
  }

  const amount = typeof value === "number" ? value : parseNumberValue(value);
  if (amount === null) {
    return fallback;
  }

  const formatted = new Intl.NumberFormat(getCurrentLocale(), {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
  const language = i18n.language.split("-")[0];

  if (language === "ru") {
    return `${formatted} сум`;
  }
  if (language === "uz") {
    return `${formatted} so'm`;
  }
  return `${formatted} UZS`;
}
