import {
  BadgeCheck,
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Filter,
  GraduationCap,
  Languages,
  ListChecks,
  MapPin,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface LandingStat {
  valueKey: string;
  labelKey: string;
}

export interface LandingFeature {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
}

export interface LandingStep {
  number: string;
  titleKey: string;
  descriptionKey: string;
}

export interface LandingUniversityPreview {
  name: string;
  metaKey: string;
  programsKey: string;
  tuitionKey: string;
  deadlineKey: string;
}

export interface LandingComparisonRow {
  icon: LucideIcon;
  labelKey: string;
  firstKey: string;
  secondKey: string;
}

export const landingStats: LandingStat[] = [
  { valueKey: "stats.values.editable", labelKey: "stats.universities" },
  { valueKey: "stats.values.live", labelKey: "stats.programs" },
  { valueKey: "stats.values.steps", labelKey: "stats.steps" },
  { valueKey: "stats.values.regions", labelKey: "stats.regions" },
];

export const landingFeatures: LandingFeature[] = [
  { icon: Search, titleKey: "features.discovery.title", descriptionKey: "features.discovery.description" },
  { icon: Filter, titleKey: "features.filters.title", descriptionKey: "features.filters.description" },
  { icon: Scale, titleKey: "features.compare.title", descriptionKey: "features.compare.description" },
  { icon: CalendarClock, titleKey: "features.planner.title", descriptionKey: "features.planner.description" },
  { icon: BellRing, titleKey: "features.deadlines.title", descriptionKey: "features.deadlines.description" },
  { icon: Sparkles, titleKey: "features.scholarships.title", descriptionKey: "features.scholarships.description" },
  { icon: ClipboardCheck, titleKey: "features.documents.title", descriptionKey: "features.documents.description" },
  { icon: ListChecks, titleKey: "features.progress.title", descriptionKey: "features.progress.description" },
];

export const landingSteps: LandingStep[] = [
  { number: "01", titleKey: "how.steps.explore.title", descriptionKey: "how.steps.explore.description" },
  { number: "02", titleKey: "how.steps.compare.title", descriptionKey: "how.steps.compare.description" },
  { number: "03", titleKey: "how.steps.prepare.title", descriptionKey: "how.steps.prepare.description" },
  { number: "04", titleKey: "how.steps.apply.title", descriptionKey: "how.steps.apply.description" },
];

export const universityPreviews: LandingUniversityPreview[] = [
  {
    name: "Westminster International University in Tashkent",
    metaKey: "universities.cards.wiut.meta",
    programsKey: "universities.cards.wiut.programs",
    tuitionKey: "universities.cards.wiut.tuition",
    deadlineKey: "universities.cards.wiut.deadline",
  },
  {
    name: "TEAM University",
    metaKey: "universities.cards.team.meta",
    programsKey: "universities.cards.team.programs",
    tuitionKey: "universities.cards.team.tuition",
    deadlineKey: "universities.cards.team.deadline",
  },
  {
    name: "AKFA University",
    metaKey: "universities.cards.akfa.meta",
    programsKey: "universities.cards.akfa.programs",
    tuitionKey: "universities.cards.akfa.tuition",
    deadlineKey: "universities.cards.akfa.deadline",
  },
];

export const comparisonRows: LandingComparisonRow[] = [
  { icon: WalletCards, labelKey: "compare.rows.tuition", firstKey: "compare.values.clear", secondKey: "compare.values.varies" },
  { icon: MapPin, labelKey: "compare.rows.location", firstKey: "compare.values.tashkent", secondKey: "compare.values.regional" },
  { icon: Languages, labelKey: "compare.rows.language", firstKey: "compare.values.english", secondKey: "compare.values.uzbekRussian" },
  { icon: BadgeCheck, labelKey: "compare.rows.scholarships", firstKey: "compare.values.available", secondKey: "compare.values.check" },
  { icon: CalendarClock, labelKey: "compare.rows.deadlines", firstKey: "compare.values.tracked", secondKey: "compare.values.reminders" },
];

export const applicationChecklist = [
  "passport",
  "diploma",
  "photo",
  "language",
  "exam",
  "motivation",
  "translation",
  "verification",
] as const;

export const partnerBenefits = [
  { icon: FileCheck2, key: "partners.benefits.structured" },
  { icon: GraduationCap, key: "partners.benefits.pipeline" },
  { icon: Building2, key: "partners.benefits.statistics" },
  { icon: ShieldCheck, key: "partners.benefits.recruitment" },
  { icon: CheckCircle2, key: "partners.benefits.communication" },
];
