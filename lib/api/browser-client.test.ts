import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserApiError, requestJson } from "./browser-client";

const fetchMock = vi.fn<typeof fetch>();

describe("browser requestJson", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("uses the same-origin route without attaching the upstream API key", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: "ok" }));

    await expect(requestJson("/api/health")).resolves.toEqual({
      status: "ok",
    });

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/health");
    expect(new Headers(init?.headers).has("x-api-key")).toBe(false);
    expect(init?.cache).toBe("no-store");
  });

  it("preserves safe error messages and status codes", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "Part not found" }, { status: 404 }),
    );

    await expect(requestJson("/api/parts/missing")).rejects.toMatchObject({
      status: 404,
      message: "Part not found",
    } satisfies Partial<BrowserApiError>);
  });

  it("treats a response interrupted mid-body as a connection failure", async () => {
    const interruptedBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"uuid":'));
        controller.error(new TypeError("terminated"));
      },
    });
    fetchMock.mockResolvedValueOnce(new Response(interruptedBody, { status: 200 }));

    const request = requestJson("/api/parts/example", {
      method: "PUT",
      body: JSON.stringify({ unit: "pcs" }),
    });

    await expect(request).rejects.toBeInstanceOf(BrowserApiError);
    await expect(request).rejects.toMatchObject({ status: 0 });
  });

  it("preserves the API-defined invalid-status error and allowable statuses", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          error: "Invalid status change",
          allowableStatuses: ["active", "deprecated"],
        },
        { status: 400 },
      ),
    );

    await expect(requestJson("/api/parts/example")).rejects.toMatchObject({
      status: 400,
      body: {
        error: "Invalid status change",
        allowableStatuses: ["active", "deprecated"],
      },
    } satisfies Partial<BrowserApiError>);
  });
});
