import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LegacyRedirect } from "../LegacyRedirects";

describe("LegacyRedirect", () => {
  it("redirects known legacy path", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<LegacyRedirect path="/dashboard" />} />
          <Route path="/student/dashboard" element={<div>Student Home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Student Home")).toBeInTheDocument();
  });

  it("redirects unknown paths to sign in", () => {
    render(
      <MemoryRouter initialEntries={["/legacy"]}>
        <Routes>
          <Route path="/legacy" element={<LegacyRedirect path="/legacy" />} />
          <Route path="/auth/sign-in" element={<div>Sign In</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });
});
