import { describe, expect, it } from "vitest";
import { BrowserApiError } from "@/lib/api/browser-client";
import { getUserFacingApiError } from "./user-facing-error";

describe("getUserFacingApiError", () => {
  it("distinguishes access denial from a connection failure", () => {
    expect(
      getUserFacingApiError(
        new BrowserApiError(403, { error: "Forbidden" }),
        "machine-list",
      ),
    ).toBe("Access to the service was denied. Contact your administrator.");
    expect(
      getUserFacingApiError(
        new BrowserApiError(0, { error: "Network unavailable" }),
        "machine-list",
      ),
    ).toBe("The service could not be reached. Check your connection and retry.");
  });

  it("uses API-defined not-found messages and a nontechnical server fallback", () => {
    expect(
      getUserFacingApiError(
        new BrowserApiError(404, { error: "Part not found" }),
        "part",
      ),
    ).toBe("Part not found");
    expect(
      getUserFacingApiError(
        new BrowserApiError(500, { error: "Internal server error" }),
        "assembly",
      ),
    ).toBe("The service is temporarily unavailable. Try again.");
  });
});
