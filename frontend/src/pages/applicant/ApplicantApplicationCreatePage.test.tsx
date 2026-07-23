import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicantApplicationCreatePage } from "./ApplicantApplicationCreatePage";

describe("ApplicantApplicationCreatePage", () => {
  it("renders the enabled application wizard", () => {
    render(
      <MemoryRouter initialEntries={["/applicant/applications/new/wiut-id"]}>
        <Routes>
          <Route path="/applicant/applications/new/:universityId" element={<ApplicantApplicationCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /application process/i })).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Requirements")).toBeInTheDocument();
    expect(screen.queryByText("Currently Not Available")).not.toBeInTheDocument();
  });
});
