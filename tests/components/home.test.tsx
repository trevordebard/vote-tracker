import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("Home page", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });

  it("navigates to the room when a code is submitted", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const input = screen.getByPlaceholderText("ABC123");
    await user.type(input, " ab123 ");
    await user.click(screen.getByRole("button", { name: /join room/i }));

    expect(push).toHaveBeenCalledWith("/room/AB123");
  });

  it("shows hosted rooms saved in local storage", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "vote-tracker:hosted-rooms",
      JSON.stringify([
        { code: "ZXCV12", lastVisitedAt: new Date().toISOString() },
      ])
    );
    render(<Home />);

    expect(screen.getByText("ZXCV12")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open host view/i }));
    expect(push).toHaveBeenCalledWith("/host/ZXCV12");
  });
});
