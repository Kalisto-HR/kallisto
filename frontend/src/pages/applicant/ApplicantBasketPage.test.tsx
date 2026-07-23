import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicantBasketPage } from "./ApplicantBasketPage";
import { routes } from "../../routes/routeConfig";
import {
  clearBasket,
  fetchBasketState,
  removeBasketItem,
} from "../../services/applicant/basketService";

vi.mock("../../services/applicant/basketService", () => ({
  clearBasket: vi.fn(),
  fetchBasketState: vi.fn(),
  removeBasketItem: vi.fn(),
}));

describe("ApplicantBasketPage", () => {
  beforeEach(() => {
    vi.mocked(fetchBasketState).mockResolvedValue({
      items: [
        {
          id: "uni-1",
          name: "New Uzbekistan University",
          province: null,
          city: "Tashkent",
          country: "Uzbekistan",
          applicationFee: 800,
          acceptanceRate: 0.2,
          tuitionFee: 40000,
          applicationDeadline: null,
          ieltsMin: 6.5,
          toeflMin: 90,
          scholarshipAvailable: true,
          cityType: "urban",
          campusVibe: "research-led",
        },
      ],
      selectedPlanId: "plan-1",
      recommendedPlanId: "plan-1",
      totalUniversities: 1,
      maxPlanCapacity: 20,
    });

    vi.mocked(clearBasket).mockResolvedValue(undefined);
    vi.mocked(removeBasketItem).mockResolvedValue(undefined);
  });

  it("renders a clean university shortlist without legacy checkout blocks", async () => {
    render(
      <MemoryRouter initialEntries={[routes.applicant.basket]}>
        <Routes>
          <Route path={routes.applicant.basket} element={<ApplicantBasketPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("New Uzbekistan University")).toBeInTheDocument();
    expect(screen.getByText(/keep universities you are considering/i)).toBeInTheDocument();
    expect(screen.queryByText(/choose plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/checkout summary/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /checkout unavailable/i })).not.toBeInTheDocument();
  });
});


