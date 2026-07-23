import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ApplicantMatchProfileEditor } from "./ApplicantMatchProfileEditor";
import { calculateDocumentReadiness } from "./applicantMatchProfile";
import type { ApplicantMatchProfileForm } from "./ApplicantMatchProfileEditor";

const baseValue: ApplicantMatchProfileForm = {
  nationality: "Uzbekistan",
  educationLevel: "bachelor",
  gpa: "3.6",
  gpaScale: "4",
  intendedMajor: "Computer Science",
  budgetPerYear: "22000",
  preferredLanguage: "English",
  preferredCity: "Tashkent",
  documentsReady: ["Passport"],
  achievements: "Hackathon finalist",
};

describe("ApplicantMatchProfileEditor", () => {
  it("tracks document readiness and emits changed match fields", () => {
    const onChange = vi.fn();

    function StatefulEditor() {
      const [value, setValue] = useState(baseValue);
      return (
        <ApplicantMatchProfileEditor
          value={value}
          onChange={(nextValue) => {
            setValue(nextValue);
            onChange(nextValue);
          }}
          onSave={vi.fn()}
          onReset={vi.fn()}
        />
      );
    }

    render(<StatefulEditor />);

    expect(screen.getByText(/document readiness/i)).toBeInTheDocument();
    expect(screen.getByText("1/7")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/intended major/i), { target: { value: "Data Science" } });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ intendedMajor: "Data Science" }));

    fireEvent.click(screen.getByRole("checkbox", { name: /academic transcript/i }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ documentsReady: ["Passport", "Academic transcript"] }),
    );
  });

  it("calculates document readiness percentage", () => {
    expect(calculateDocumentReadiness(["Passport", "Academic transcript"])).toBe(29);
  });
});
