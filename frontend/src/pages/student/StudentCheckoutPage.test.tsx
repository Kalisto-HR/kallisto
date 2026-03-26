import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StudentCheckoutPage } from "./StudentCheckoutPage";
import { routes } from "../../routes/routeConfig";

describe("StudentCheckoutPage", () => {
  it("renders an unavailable state instead of a fake payment success flow", () => {
    render(
      <MemoryRouter initialEntries={[routes.student.checkout]}>
        <Routes>
          <Route path={routes.student.checkout} element={<StudentCheckoutPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /checkout unavailable/i })).toBeInTheDocument();
    expect(screen.getByText(/payment capture is not implemented yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/payment successful/i)).not.toBeInTheDocument();
  });

  it("shows basket preview data as preview-only when route state is provided", () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: routes.student.checkout,
            state: {
              basketPreview: {
                plan: {
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
                universities: [],
                applicationCount: 4,
                estimatedTotal: 299,
                status: "preview",
                readyForPaymentApi: false,
                warnings: ["Payment capture is disabled in this environment."],
              },
            },
          },
        ]}
      >
        <Routes>
          <Route path={routes.student.checkout} element={<StudentCheckoutPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Priority Bundle")).toBeInTheDocument();
    expect(screen.getByText(/preview only/i)).toBeInTheDocument();
    expect(screen.getByText(/4 selected universities/i)).toBeInTheDocument();
  });
});
