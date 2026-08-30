import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QuickCheck } from "@/components/QuickCheck";

const QUICK_CHECK_STORAGE_KEY = "nova-301-quick-check";

describe("QuickCheck", () => {
  beforeEach(() => {
    window.localStorage.clear();
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
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("does not initialise quick-check data in browser storage", () => {
    render(<QuickCheck />);

    expect(window.localStorage.getItem(QUICK_CHECK_STORAGE_KEY)).toBeNull();
  });

  it("does not persist quick-check answers in browser storage", async () => {
    const user = userEvent.setup();
    render(<QuickCheck />);

    await user.click(screen.getByRole("radio", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(window.localStorage.getItem(QUICK_CHECK_STORAGE_KEY)).toBeNull();
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
