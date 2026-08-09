import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QuickCheck } from "@/components/QuickCheck";

describe("QuickCheck", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ handoffId: "handoff-123" }),
      }),
    );
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a handoff after completing the quick check", async () => {
    const user = userEvent.setup();
    render(<QuickCheck />);

    for (let index = 0; index < 5; index += 1) {
      await user.click(screen.getByRole("radio", { name: "Yes" }));
      await user.click(
        screen.getByRole("button", {
          name: index === 4 ? "See result" : "Next",
        }),
      );
    }

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Research centre" }),
      "site-london",
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to prescreener" }),
    );

    expect(fetch).toHaveBeenCalledOnce();
    expect(
      await screen.findByText(/details have been passed to the prescreener/i),
    ).toBeInTheDocument();
  });
});
