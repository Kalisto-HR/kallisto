import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LandingPage } from "./LandingPage";

describe("LandingPage", () => {
  it("renders the public landing content and primary auth links", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /find the right private university/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /sign in/i })[0]).toHaveAttribute("href", "/auth/sign-in");
    expect(screen.getAllByRole("link", { name: /get started/i })[0]).toHaveAttribute("href", "/auth/sign-up");
  });
});
