import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import enApplications from "./locales/en/applications.json";
import enStudents from "./locales/en/students.json";
import enLanding from "./locales/en/landing.json";
import ruCommon from "./locales/ru/common.json";
import ruDashboard from "./locales/ru/dashboard.json";
import ruApplications from "./locales/ru/applications.json";
import ruStudents from "./locales/ru/students.json";
import ruLanding from "./locales/ru/landing.json";
import uzCommon from "./locales/uz/common.json";
import uzDashboard from "./locales/uz/dashboard.json";
import uzApplications from "./locales/uz/applications.json";
import uzStudents from "./locales/uz/students.json";
import uzLanding from "./locales/uz/landing.json";

export const LANGUAGE_STORAGE_KEY = "kallisto_language";
export const supportedLanguages = ["en", "ru", "uz"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageLocaleMap: Record<SupportedLanguage, string> = {
  en: "en-US",
  ru: "ru-RU",
  uz: "uz-UZ",
};

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage);
}

export function resolveInitialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isSupportedLanguage(saved)) {
    return saved;
  }

  const browserLanguage = navigator.language.split("-")[0];
  return isSupportedLanguage(browserLanguage) ? browserLanguage : "en";
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, dashboard: enDashboard, applications: enApplications, students: enStudents, landing: enLanding },
      ru: { common: ruCommon, dashboard: ruDashboard, applications: ruApplications, students: ruStudents, landing: ruLanding },
      uz: { common: uzCommon, dashboard: uzDashboard, applications: uzApplications, students: uzStudents, landing: uzLanding },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (language) => {
  const normalized = language.split("-")[0];
  if (isSupportedLanguage(normalized)) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  }
});

export function getCurrentLocale(): string {
  const language = i18n.language.split("-")[0];
  return isSupportedLanguage(language) ? languageLocaleMap[language] : languageLocaleMap.en;
}

export default i18n;
