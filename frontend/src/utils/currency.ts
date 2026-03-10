export interface RmbFormatOptions {
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
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function formatNumeric(amount: number, options: RmbFormatOptions): string {
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

export function formatRmb(value: number | string | null | undefined, options: RmbFormatOptions = {}): string {
  const fallback = options.fallback ?? "N/A";

  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "number") {
    return formatNumeric(value, options);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  const parsed = parseNumberValue(trimmed);
  if (parsed === null) {
    return replaceCurrencyTokens(trimmed, Boolean(options.withUnit));
  }

  return formatNumeric(parsed, options);
}
