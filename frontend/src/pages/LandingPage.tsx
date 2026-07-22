import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { routes } from "../routes/routeConfig";
import { ScrollImageSequence } from "../components/landing/ScrollImageSequence";
import { BrandLogo } from "../components/common/BrandLogo";
import {
  applicationChecklist,
  comparisonRows,
  landingFeatures,
  landingStats,
  landingSteps,
  partnerBenefits,
  universityPreviews,
} from "../components/landing/landingData";

const navItems = [
  { labelKey: "nav.universities", href: "#universities" },
  { labelKey: "nav.compare", href: "#compare" },
  { labelKey: "nav.scholarships", href: "#features" },
  { labelKey: "nav.howItWorks", href: "#how-it-works" },
  { labelKey: "nav.forUniversities", href: "#partners" },
];

function LandingHeader() {
  const { t } = useTranslation("landing");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="brand-topbar sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandLogo alt="" className="h-9 w-9" />
          <span className="text-xl font-semibold tracking-tight">Kallisto</span>
        </a>

        <nav className="ml-8 hidden items-center gap-1 lg:flex" aria-label={t("header.primaryNavigation")}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t(item.labelKey)}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link to={routes.auth.signIn}>{t("actions.signIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={routes.auth.signUp}>{t("actions.getStarted")}</Link>
          </Button>
        </div>

        <Button variant="ghost" size="icon" className="ml-auto sm:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label={t("header.toggleMenu")}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen ? (
        <div className="border-t bg-card/95 px-4 py-4 shadow-lg sm:hidden">
          <nav className="grid gap-1" aria-label={t("header.mobileNavigation")}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2 text-sm font-medium hover:bg-secondary/80">
                {t(item.labelKey)}
              </a>
            ))}
          </nav>
          <div className="mt-4 grid gap-2">
            <LanguageSwitcher />
            <Button asChild variant="outline">
              <Link to={routes.auth.signIn}>{t("actions.signIn")}</Link>
            </Button>
            <Button asChild>
              <Link to={routes.auth.signUp}>{t("actions.getStarted")}</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function HeroPreview() {
  const { t } = useTranslation("landing");
  return (
    <div className="brand-panel brand-panel-accent relative overflow-hidden p-4 sm:p-6">
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">{t("hero.previewTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("hero.previewSubtitle")}</p>
          </div>
          <Badge variant="success">{t("hero.previewBadge")}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {["fit", "deadline", "documents"].map((key) => (
            <div key={key} className="rounded-xl border bg-card/80 p-3">
              <p className="text-xs text-muted-foreground">{t(`hero.metrics.${key}.label`)}</p>
              <p className="mt-1 text-xl font-semibold">{t(`hero.metrics.${key}.value`)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-card/90 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{t("hero.tracker.title")}</p>
              <p className="text-sm text-muted-foreground">{t("hero.tracker.subtitle")}</p>
            </div>
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            {["profile", "compare", "documents", "submit"].map((key, index) => (
              <div key={key} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{t(`hero.tracker.items.${key}`)}</span>
                    <span className="text-xs text-muted-foreground">{index < 2 ? t("hero.tracker.done") : t("hero.tracker.next")}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${index < 2 ? 100 : 42}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { t } = useTranslation("landing");

  return (
    <div id="top" className="brand-shell min-h-screen">
      <LandingHeader />

      <main>
        <ScrollImageSequence>
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-20 sm:px-6 md:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-5 border-white/25 bg-white/10 text-white">{t("hero.eyebrow")}</Badge>
              <h1 className="text-4xl font-semibold leading-tight tracking-normal text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
                {t("hero.title")}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                {t("hero.subtitle")}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to={routes.applicant.universities}>{t("actions.exploreUniversities")}<ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <Link to={routes.auth.signUp}>{t("actions.startApplication")}</Link>
                </Button>
              </div>
            </div>
            <HeroPreview />
          </div>
        </ScrollImageSequence>

        <section className="border-y border-border/70 bg-card/45">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {landingStats.map((stat) => (
              <div key={stat.labelKey} className="rounded-2xl border bg-card/75 p-4">
                <div className="text-2xl font-semibold text-primary">{t(stat.valueKey)}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t(stat.labelKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{t("features.title")}</h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-muted-foreground lg:text-right">{t("features.subtitle")}</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {landingFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.titleKey} className="h-full">
                  <CardHeader className="space-y-4 p-5 sm:p-6">
                    <div className="brand-icon-tile flex h-11 w-11 items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="leading-snug">{t(feature.titleKey)}</CardTitle>
                      <CardDescription className="leading-6">{t(feature.descriptionKey)}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold text-foreground">{t("how.title")}</h2>
              <p className="mt-3 text-muted-foreground">{t("how.subtitle")}</p>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-4">
              {landingSteps.map((step) => (
                <div key={step.number} className="rounded-2xl border bg-card p-5">
                  <div className="mb-5 text-sm font-semibold text-primary">{step.number}</div>
                  <h3 className="text-lg font-semibold text-foreground">{t(step.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(step.descriptionKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="universities" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold text-foreground">{t("universities.title")}</h2>
              <p className="mt-3 text-muted-foreground">{t("universities.subtitle")}</p>
            </div>
            <Button asChild variant="outline">
              <Link to={routes.applicant.universities}>{t("actions.viewCatalog")}<ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {universityPreviews.map((university) => (
              <Card key={university.name}>
                <CardHeader>
                  <Badge variant="outline">{t(university.metaKey)}</Badge>
                  <CardTitle>{university.name}</CardTitle>
                  <CardDescription>{t(university.programsKey)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">{t("universities.labels.tuition")}</span><span className="font-medium">{t(university.tuitionKey)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">{t("universities.labels.deadline")}</span><span className="font-medium">{t(university.deadlineKey)}</span></div>
                  <Link to={routes.auth.signIn} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-brand-primary-hover">
                    {t("actions.viewDetails")}<ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="compare" className="bg-card/40">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
            <div>
              <h2 className="text-3xl font-semibold text-foreground">{t("compare.title")}</h2>
              <p className="mt-3 text-muted-foreground">{t("compare.subtitle")}</p>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-card">
              {comparisonRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.labelKey} className="grid grid-cols-[1fr_0.9fr_0.9fr] gap-3 border-b p-4 text-sm last:border-b-0">
                    <div className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-primary" />{t(row.labelKey)}</div>
                    <div className="text-muted-foreground">{t(row.firstKey)}</div>
                    <div className="text-muted-foreground">{t(row.secondKey)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold text-foreground">{t("journey.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("journey.subtitle")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {applicationChecklist.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">{t(`journey.checklist.${item}`)}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="partners" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="brand-panel brand-panel-accent grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="default">{t("partners.eyebrow")}</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-foreground">{t("partners.title")}</h2>
              <p className="mt-3 text-muted-foreground">{t("partners.subtitle")}</p>
              <Button asChild className="mt-6">
                <Link to={routes.auth.signIn}>{t("actions.partnerWithKallisto")}<ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {partnerBenefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.key} className="flex items-start gap-3 rounded-2xl border bg-card/80 p-4">
                    <Icon className="mt-0.5 h-5 w-5 text-primary" />
                    <p className="text-sm font-medium">{t(benefit.key)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-primary px-6 py-12 text-primary-foreground sm:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <GraduationCap className="mx-auto mb-5 h-10 w-10" />
              <h2 className="text-3xl font-semibold">{t("finalCta.title")}</h2>
              <p className="mt-3 text-primary-foreground/80">{t("finalCta.subtitle")}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild variant="secondary">
                  <Link to={routes.applicant.universities}>{t("actions.exploreUniversities")}</Link>
                </Button>
                <Button asChild variant="outline" className="border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15">
                  <Link to={routes.auth.signUp}>{t("actions.createAccount")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card/65">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo alt="" className="h-9 w-9" />
              <span className="text-lg font-semibold">Kallisto</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t("footer.description")}</p>
          </div>
          {["platform", "students", "universities"].map((group) => (
            <div key={group}>
              <h3 className="text-sm font-semibold">{t(`footer.${group}.title`)}</h3>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {["first", "second", "third"].map((item) => (
                  <a key={item} href={t(`footer.${group}.${item}.href`)} className="hover:text-foreground">
                    {t(`footer.${group}.${item}.label`)}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}
