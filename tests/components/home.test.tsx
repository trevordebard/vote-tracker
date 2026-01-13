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
  });

  it("navigates to the room when a code is submitted", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const input = screen.getByPlaceholderText("ABC123");
    await user.type(input, " ab123 ");
    await user.click(screen.getByRole("button", { name: /join room/i }));

    expect(push).toHaveBeenCalledWith("/room/AB123");
  });
});
