import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import i18n from "../i18n";
import { Header } from "./Header";

describe("Header", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("keeps basket and application counts reactive across rerenders and language changes", async () => {
    const props = {
      userName: "Ava Li",
      onNavigate: vi.fn(),
      onLogout: vi.fn(),
      onMenuClick: vi.fn(),
    };

    const { rerender } = render(
      <Header
        {...props}
        applicationsCount={0}
        basketCount={0}
      />,
    );

    expect(screen.getByText("0 Basket Items")).toBeInTheDocument();
    expect(screen.getByText("0 Applications")).toBeInTheDocument();

    rerender(
      <Header
        {...props}
        applicationsCount={2}
        basketCount={3}
      />,
    );

    expect(screen.getByText("3 Basket Items")).toBeInTheDocument();
    expect(screen.getByText("2 Applications")).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage("ru");
    });

    await waitFor(() => {
      expect(screen.getByText("3 в корзине")).toBeInTheDocument();
    });
    expect(screen.getByText("2 заявки")).toBeInTheDocument();
  });
});
