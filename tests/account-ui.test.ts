// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mocks = vi.hoisted(() => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next-auth/react", () => mocks);
import SignInButton from "../components/sign-in";
import AccountMenu from "../components/account-menu";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});
describe("Account actions", () => {
  it("starts Google sign-in with a fixed internal destination", async () => {
    render(createElement(SignInButton, { configured: true }));
    await userEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(mocks.signIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/dashboard",
    });
  });
  it("disables sign-in before OAuth configuration is available", () => {
    render(createElement(SignInButton, { configured: false }));
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
  it("shows the real account and clears the selected event on sign-out", async () => {
    localStorage.setItem("eventiq-event", "private-event");
    render(
      createElement(AccountMenu, {
        account: { name: "Asha Patel", email: "asha@example.com", demo: false },
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Asha Patel/ }));
    expect(screen.getByText("asha@example.com")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() =>
      expect(mocks.signOut).toHaveBeenCalledWith({ callbackUrl: "/signin" }),
    );
    expect(localStorage.getItem("eventiq-event")).toBeNull();
  });
});
