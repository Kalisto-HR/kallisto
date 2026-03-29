import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicantBillingPage } from "./ApplicantBillingPage";
import { routes } from "../../routes/routeConfig";

describe("ApplicantBillingPage", () => {
  it("renders an explicit unavailable state with no pseudo billing data", () => {
    render(
      <MemoryRouter initialEntries={[routes.applicant.billing]}>
        <Routes>
          <Route path={routes.applicant.billing} element={<ApplicantBillingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /billing unavailable/i })).toBeInTheDocument();
    expect(screen.getByText(/billing is not live yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buy package/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save card/i })).not.toBeInTheDocument();
  });
});
