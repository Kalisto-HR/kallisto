import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicantBillingPage } from "./ApplicantBillingPage";
import { routes } from "../../routes/routeConfig";
import { fetchBillingSummary } from "../../services/applicant/billingService";

vi.mock("../../services/applicant/billingService", () => ({
  completeDevelopmentPayment: vi.fn(),
  createBillingOrder: vi.fn(),
  fetchBillingSummary: vi.fn(),
}));

describe("ApplicantBillingPage", () => {
  beforeEach(() => {
    vi.mocked(fetchBillingSummary).mockResolvedValue({
      creditBalance: 2,
      creditsPurchased: 5,
      creditsUsed: 3,
      draftApplications: 1,
      submittedApplications: 3,
      hasActivePremium: false,
      subscription: null,
      products: [
        {
          id: "single_application",
          productType: "application_credit",
          name: "Single application",
          description: "One application submission credit",
          credits: 1,
          priceAmount: 10000,
          currency: "UZS",
          interval: null,
          intervalCount: null,
          active: true,
        },
        {
          id: "application_pack_5",
          productType: "application_credit",
          name: "Five-application package",
          description: "Five discounted application submission credits",
          credits: 5,
          priceAmount: 45000,
          currency: "UZS",
          interval: null,
          intervalCount: null,
          active: true,
        },
        {
          id: "application_pack_10",
          productType: "application_credit",
          name: "Ten-application package",
          description: "Ten discounted application submission credits",
          credits: 10,
          priceAmount: 90000,
          currency: "UZS",
          interval: null,
          intervalCount: null,
          active: true,
        },
        {
          id: "premium_monthly",
          productType: "subscription",
          name: "Premium Monthly",
          description: "Unlocks Compare and Match Score for one month",
          credits: 0,
          priceAmount: 50000,
          currency: "UZS",
          interval: "month",
          intervalCount: 1,
          active: true,
        },
      ],
      orders: [],
      creditHistory: [],
    });
  });

  it("renders live billing products and separates credits from premium", async () => {
    render(
      <MemoryRouter initialEntries={[routes.applicant.billing]}>
        <Routes>
          <Route path={routes.applicant.billing} element={<ApplicantBillingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /^billing$/i })).toBeInTheDocument();
    expect(screen.getByText(/application credits and premium are separate/i)).toBeInTheDocument();
    expect(screen.getByText("Single application")).toBeInTheDocument();
    expect(screen.getByText("Five-application package")).toBeInTheDocument();
    expect(screen.getByText("Ten-application package")).toBeInTheDocument();
    expect(screen.getByText("Kallisto Premium")).toBeInTheDocument();
    expect(screen.getByText(/premium does not include application credits/i)).toBeInTheDocument();
  });
});
