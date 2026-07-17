import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTranslation } from "react-i18next";
import i18n, { LANGUAGE_STORAGE_KEY } from "./index";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { translateRegionCode } from "./regions";

function DashboardTitle() {
  const { t } = useTranslation("dashboard");
  return <h1>{t("partner.studentOrigin.title")}</h1>;
}

describe("i18n", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("uses English as fallback language", async () => {
    await i18n.changeLanguage("fr");
    expect(i18n.t("dashboard:partner.studentOrigin.title")).toBe("Student Origin Statistics");
  });

  it("persists selected language and updates visible text without reload", async () => {
    const user = userEvent.setup();

    render(
      <>
        <LanguageSwitcher />
        <DashboardTitle />
      </>,
    );

    expect(screen.getByText("Student Origin Statistics")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: /interface language/i }));
    await user.click(screen.getByRole("option", { name: /RU/i }));

    await waitFor(() => {
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ru");
    });
    expect(screen.getByText("Статистика по регионам студентов")).toBeInTheDocument();
  });

  it("translates region names and falls back safely for unknown codes", async () => {
    await i18n.changeLanguage("uz");
    expect(translateRegionCode(i18n.t, "qashqadaryo")).toBe("Qashqadaryo viloyati");
    expect(translateRegionCode(i18n.t, "unsupported")).toBe("Hudud ko‘rsatilmagan");
  });
});
