import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider } from "../context/SessionContext";

export function renderWithProviders(ui: ReactElement, initialEntries = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <SessionProvider>{ui}</SessionProvider>
    </MemoryRouter>,
  );
}
