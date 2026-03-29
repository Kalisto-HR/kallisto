import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicantHelpPage } from "./ApplicantHelpPage";
import { routes } from "../../routes/routeConfig";

describe("ApplicantHelpPage", () => {
  it("renders an explicit unavailable support state with no live support controls", () => {
    render(
      <MemoryRouter initialEntries={[routes.applicant.help]}>
        <Routes>
          <Route path={routes.applicant.help} element={<ApplicantHelpPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /support unavailable/i })).toBeInTheDocument();
    expect(screen.getByText(/help center is not active yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start chat/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /email support/i })).not.toBeInTheDocument();
  });
});
