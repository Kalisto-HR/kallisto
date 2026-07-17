import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicantApplicationCreatePage } from "./ApplicantApplicationCreatePage";

describe("ApplicantApplicationCreatePage", () => {
  it("renders the disabled applications notice", () => {
    render(
      <MemoryRouter initialEntries={["/applicant/applications/new/wiut-id"]}>
        <Routes>
          <Route path="/applicant/applications/new/:universityId" element={<ApplicantApplicationCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Currently Not Available")).toBeInTheDocument();
    expect(screen.getByText("Applications are temporarily disabled. Please check back later.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to universities/i })).toHaveAttribute("href", "/applicant/universities");
  });
});
