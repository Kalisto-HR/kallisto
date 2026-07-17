import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { supportedLanguages, type SupportedLanguage } from "./index";

const compactLabels: Record<SupportedLanguage, string> = {
  en: "EN",
  ru: "RU",
  uz: "UZ",
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation("common");
  const current = (i18n.language.split("-")[0] || "en") as SupportedLanguage;

  const changeLanguage = (language: string) => {
    void i18n.changeLanguage(language);
  };

  return (
    <Select value={current} onValueChange={changeLanguage}>
      <SelectTrigger
        aria-label={t("language.label")}
        className="h-9 w-[76px] border-border/80 bg-card/80 px-2 text-xs font-semibold shadow-none sm:w-[150px]"
      >
        <SelectValue>{compactLabels[current] ?? "EN"}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {supportedLanguages.map((language) => (
          <SelectItem key={language} value={language}>
            {t(`language.${language}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
