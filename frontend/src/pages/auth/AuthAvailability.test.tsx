import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SignInPage } from "./SignInPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

vi.mock("../../hooks/useSession", () => ({
  useSession: () => ({
    user: null,
    initialized: false,
    isAuthenticated: false,
  }),
}));

describe("auth availability pages", () => {
  it("does not render forgot-password links on the unified sign-in page", () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
  });

  it("renders the forgot-password route as unavailable", () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/password reset is currently unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to sign in/i })).toBeInTheDocument();
  });

  it("renders the reset-password route as unavailable", () => {
    render(
      <MemoryRouter initialEntries={["/auth/reset-password?token=test"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/reset links are not active right now/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows the password-changed reauth banner on sign-in", () => {
    render(
      <MemoryRouter initialEntries={["/auth/sign-in?reason=password-changed"]}>
        <SignInPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/your password changed\. please sign in again with the new password\./i)).toBeInTheDocument();
  });

  it("shows the account-updated reauth banner on sign-in", () => {
    render(
      <MemoryRouter initialEntries={["/auth/sign-in?reason=account-updated"]}>
        <SignInPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/your account access changed\. please sign in again\./i)).toBeInTheDocument();
  });
});
