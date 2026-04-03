import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicantComparePage } from "./ApplicantComparePage";
import { clearCompareList, fetchCompareList, removeCompareItem } from "../../services/applicant/compareService";
import { addBasketItem, fetchBasketState, removeBasketItem } from "../../services/applicant/basketService";

vi.mock("../../services/applicant/compareService", () => ({
  clearCompareList: vi.fn(),
  fetchCompareList: vi.fn(),
  removeCompareItem: vi.fn(),
  MAX_COMPARE_ITEMS: 4,
  COMPARE_LIMIT_MESSAGE: "You already have 4 universities in Compare. Remove one to add this university.",
}));

vi.mock("../../services/applicant/basketService", () => ({
  addBasketItem: vi.fn(),
  fetchBasketState: vi.fn(),
  removeBasketItem: vi.fn(),
}));

describe("ApplicantComparePage", () => {
  beforeEach(() => {
    vi.mocked(fetchCompareList).mockResolvedValue([
      {
        id: "uni-1",
        name: "Bukhara State University",
        province: null,
        city: "Bukhara",
        country: "Uzbekistan",
        ranking: 42,
        applicationFee: 120,
        acceptanceRate: 0.32,
        tuitionFee: 18000,
        applicationDeadline: null,
        ieltsMin: 6,
        toeflMin: 80,
        scholarshipAvailable: true,
        cityType: "urban",
        campusVibe: "historic",
      },
    ]);
    vi.mocked(fetchBasketState).mockResolvedValue({
      items: [],
      selectedPlanId: null,
      recommendedPlanId: null,
      totalUniversities: 0,
      maxPlanCapacity: 4,
    });
    vi.mocked(clearCompareList).mockResolvedValue(undefined);
    vi.mocked(removeCompareItem).mockResolvedValue(undefined);
    vi.mocked(addBasketItem).mockResolvedValue(undefined);
    vi.mocked(removeBasketItem).mockResolvedValue(undefined);
  });

  it("surfaces basket failures instead of swallowing them", async () => {
    const user = userEvent.setup();
    vi.mocked(addBasketItem).mockRejectedValueOnce(new Error("basket update failed"));

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<ApplicantComparePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText(/bukhara state university/i)).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /add to basket/i })[0]);

    await waitFor(() => {
      expect(addBasketItem).toHaveBeenCalledWith("uni-1");
    });
    expect(await screen.findByText(/basket update failed/i)).toBeInTheDocument();
    expect(screen.getByText(/unable to update your basket right now/i)).toBeInTheDocument();
  });
});
