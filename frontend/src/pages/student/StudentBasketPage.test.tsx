import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StudentBasketPage } from "./StudentBasketPage";
import { routes } from "../../routes/routeConfig";
import {
  clearBasket,
  fetchBasketPlans,
  fetchBasketState,
  removeBasketItem,
} from "../../services/client/basketService";

vi.mock("../../services/client/basketService", () => ({
  clearBasket: vi.fn(),
  fetchBasketPlans: vi.fn(),
  fetchBasketState: vi.fn(),
  removeBasketItem: vi.fn(),
}));

describe("StudentBasketPage", () => {
  beforeEach(() => {
    vi.mocked(fetchBasketPlans).mockResolvedValue([
      {
        id: "plan-1",
        name: "Priority Bundle",
        capacity: 6,
        price: 299,
        perApp: 49.83,
        savings: 50,
        featured: true,
        description: "Priority plan",
        priceCaption: "Best value",
      },
    ]);

    vi.mocked(fetchBasketState).mockResolvedValue({
      items: [
        {
          id: "uni-1",
          name: "Peking University",
          province: null,
          city: "Beijing",
          country: "China",
          ranking: 14,
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

  it("shows checkout as unavailable instead of a live purchase action", async () => {
    render(
      <MemoryRouter initialEntries={[routes.student.basket]}>
        <Routes>
          <Route path={routes.student.basket} element={<StudentBasketPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const button = await screen.findByRole("button", { name: /checkout unavailable/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/checkout is not available yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue to checkout/i })).not.toBeInTheDocument();
  });
});
