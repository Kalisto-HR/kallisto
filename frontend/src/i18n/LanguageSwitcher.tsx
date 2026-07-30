import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../components/ui/select";
import { cn } from "../components/ui/utils";
import { supportedLanguages, type SupportedLanguage } from "./index";

const compactLabels: Record<SupportedLanguage, string> = {
  en: "EN",
  ru: "RU",
  uz: "UZ",
};

const flagLabels: Record<SupportedLanguage, string> = {
  en: "United States",
  ru: "Russia",
  uz: "Uzbekistan",
};

const flagStyles: Record<SupportedLanguage, string> = {
  en: "bg-[repeating-linear-gradient(to_bottom,#b22234_0_7.7%,#ffffff_7.7%_15.4%)]",
  ru: "bg-[linear-gradient(to_bottom,#ffffff_0_33.3%,#0039a6_33.3%_66.6%,#d52b1e_66.6%_100%)]",
  uz: "bg-[linear-gradient(to_bottom,#1eb5e5_0_31%,#ce1126_31%_35%,#ffffff_35%_65%,#ce1126_65%_69%,#1eb53a_69%_100%)]",
};

function LanguageFlag({ language }: { language: SupportedLanguage }) {
  return (
    <span
      aria-label={`${flagLabels[language]} flag`}
      className={cn(
        "relative inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] border border-border/70 shadow-sm",
        flagStyles[language],
      )}
      role="img"
    >
      {language === "en" ? <span className="absolute left-0 top-0 h-[54%] w-[42%] bg-[#3c3b6e]" /> : null}
    </span>
  );
}

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
        className="h-9 w-[84px] border-border/80 bg-card/80 px-2 text-xs font-semibold shadow-none"
      >
        <span className="flex items-center gap-2">
          <LanguageFlag language={current} />
          <span>{compactLabels[current] ?? "EN"}</span>
        </span>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[96px]">
        {supportedLanguages.map((language) => (
          <SelectItem key={language} value={language}>
            <span className="flex items-center gap-2">
              <LanguageFlag language={language} />
              <span>{compactLabels[language]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
