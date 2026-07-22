import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PortalApplicantsList } from "./PortalApplicantsList";
import { usePartnerApplicantsData } from "../../hooks/usePartnerApplicantsData";

vi.mock("../../hooks/usePartnerApplicantsData", () => ({
  usePartnerApplicantsData: vi.fn(),
}));

describe("PortalApplicantsList", () => {
  const items = [
    {
      id: "app-1",
      userId: "user-1",
      universityId: "uni-1",
      applicationCycle: "2026-Fall",
      applicantInfo: {
        name: "Alice Example",
        email: "alice@example.com",
        citizenship: "Uzbekistan",
      },
      applicationData: {
        program: "Computer Science",
        activities_and_honors: ["Dean's List"],
      },
      submittedAt: "2026-02-01T08:00:00Z",
      receivedAt: "2026-02-01T08:00:00Z",
      status: "submitted" as const,
      statusProgress: 35,
      statusStage: "application_received" as const,
      isFinal: false,
      isSuccessfulOutcome: false,
    },
  ];

  beforeEach(() => {
    vi.mocked(usePartnerApplicantsData).mockReturnValue({
      items,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it("disables the header download action until a submission is selected", () => {
    render(
      <MemoryRouter initialEntries={["/partner/applications"]}>
        <Routes>
          <Route path="/partner/applications" element={<PortalApplicantsList />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /download application/i })).toBeDisabled();
  });

  it("downloads the selected application as a JSON snapshot", async () => {
    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement("a");
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === "a") {
        return anchor;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);
    const clickSpy = vi.spyOn(anchor, "click").mockImplementation(() => {});
    const createObjectURLSpy = vi.fn(() => "blob:download");
    const revokeObjectURLSpy = vi.fn();

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectURLSpy,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURLSpy,
    });

    render(
      <MemoryRouter initialEntries={["/partner/applications?applicationId=app-1"]}>
        <Routes>
          <Route path="/partner/applications" element={<PortalApplicantsList />} />
        </Routes>
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: /download application/i, hidden: true });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe("alice-example-app-1.json");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:download");

    createElementSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
