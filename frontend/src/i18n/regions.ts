import type { TFunction } from "i18next";

export const uzbekistanRegionCodes = [
  "tashkent_city",
  "karakalpakstan",
  "andijan",
  "bukhara",
  "fergana",
  "jizzakh",
  "khorezm",
  "namangan",
  "navoiy",
  "qashqadaryo",
  "samarqand",
  "sirdaryo",
  "surxondaryo",
  "tashkent_region",
] as const;

export type UzbekistanRegionCode = (typeof uzbekistanRegionCodes)[number];

export function isUzbekistanRegionCode(value: unknown): value is UzbekistanRegionCode {
  return typeof value === "string" && uzbekistanRegionCodes.includes(value as UzbekistanRegionCode);
}

export function translateRegionCode(t: TFunction, value: string | null | undefined): string {
  if (!value) {
    return t("dashboard:partner.studentOrigin.unknownRegion");
  }
  if (!isUzbekistanRegionCode(value)) {
    return t("dashboard:partner.studentOrigin.unknownRegion");
  }
  return t(`common:regions.${value}`);
}

export function sortedRegionOptions(t: TFunction) {
  return uzbekistanRegionCodes
    .map((value) => ({ value, label: t(`common:regions.${value}`) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
