import { describe, expect, it, vi } from "vitest";
import {
  ApiConfigurationError,
  ApiNetworkError,
  ApiResponseError,
  ServiceApiError,
} from "./client";
import { apiErrorResponse } from "./route-response";

vi.mock("server-only", () => ({}));

describe("apiErrorResponse", () => {
  it("reports lost or invalid upstream responses as server failures", async () => {
    const lost = apiErrorResponse(new ApiNetworkError());

    expect(lost.status).toBe(502);
    expect(await lost.json()).toEqual({
      error: "Temporal Configuration Service could not be reached.",
    });
    expect(apiErrorResponse(new ApiResponseError()).status).toBe(502);
    expect(apiErrorResponse(new ApiConfigurationError()).status).toBe(503);
  });

  it("passes documented service rejections through without caching", async () => {
    const body = {
      error: "Invalid status change",
      allowableStatuses: ["active", "deprecated"],
    };
    const response = apiErrorResponse(new ServiceApiError(400, body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(body);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
