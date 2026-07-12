import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { KallistoMatchScoreCard } from "./KallistoMatchScoreCard";
import type { FitScoreResult } from "../../types/domain";

describe("KallistoMatchScoreCard", () => {
  it("renders the score, breakdown, recommendations, and disclaimer", () => {
    render(<KallistoMatchScoreCard score={scoreResult} />);

    expect(screen.getByText(/kallisto match score/i)).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText(/strong fit/i)).toBeInTheDocument();
    expect(screen.getByText(/academic fit/i)).toBeInTheDocument();
    expect(screen.getByText(/language fit/i)).toBeInTheDocument();
    expect(screen.getByText(/prepare scholarship materials/i)).toBeInTheDocument();
    expect(screen.getByText(/does not guarantee admission or scholarship results/i)).toBeInTheDocument();
  });

  it("renders an error state without score content", () => {
    render(<KallistoMatchScoreCard score={null} error="Fit score is unavailable." />);

    expect(screen.getByText(/fit score is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText("/100")).not.toBeInTheDocument();
  });

  it("links Improve My Score to the match profile editor when provided", () => {
    render(
      <MemoryRouter>
        <KallistoMatchScoreCard score={scoreResult} improveHref="/applicant/settings?tab=match-profile" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /improve my score/i })).toHaveAttribute(
      "href",
      "/applicant/settings?tab=match-profile",
    );
  });
});

const scoreResult: FitScoreResult = {
  finalScore: 78,
  label: "Strong Fit",
  breakdown: {
    academicScore: 82,
    languageScore: 90,
    majorScore: 75,
    budgetScore: 70,
    documentScore: 80,
    deadlineScore: 95,
  },
  reasons: ["Intended major is related to the program major."],
  recommendations: ["Prepare scholarship materials early to close the budget gap."],
};
