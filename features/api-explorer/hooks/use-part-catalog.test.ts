// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Part } from "@/domains/parts/types";
import { usePartCatalog } from "./use-part-catalog";

const requestJsonMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/browser-client", () => ({
  requestJson: requestJsonMock,
  BrowserApiError: class BrowserApiError extends Error {},
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function part(uuid: string, name: string): Part {
  return {
    uuid,
    partNo: `TM-${uuid}`,
    name,
    status: "active",
    unit: "set",
  };
}

describe("usePartCatalog", () => {
  it("limits concurrent part lookups and reuses the shared catalog", async () => {
    const uuids = [
      "part-1",
      "part-2",
      "part-3",
      "part-4",
      "part-5",
      "part-6",
    ];
    const resolvers = new Map<string, (value: Part) => void>();
    let activeRequests = 0;
    let peakRequests = 0;
    requestJsonMock.mockImplementation((path: string) => {
      const uuid = path.split("/").at(-1) ?? "";
      activeRequests += 1;
      peakRequests = Math.max(peakRequests, activeRequests);
      return new Promise<Part>((resolve) => {
        resolvers.set(uuid, (value) => {
          activeRequests -= 1;
          resolve(value);
        });
      });
    });

    const catalog = renderHook(() => usePartCatalog());
    let requests: Promise<Part>[] = [];
    act(() => {
      requests = uuids.map((uuid) => catalog.result.current.loadPart(uuid));
    });

    await waitFor(() => expect(requestJsonMock).toHaveBeenCalledTimes(4));
    expect(peakRequests).toBe(4);
    await act(async () => {
      uuids.slice(0, 4).forEach((uuid) =>
        resolvers.get(uuid)?.(part(uuid, `Part ${uuid}`)),
      );
      await Promise.resolve();
    });
    await waitFor(() => expect(requestJsonMock).toHaveBeenCalledTimes(6));
    await act(async () => {
      uuids.slice(4).forEach((uuid) =>
        resolvers.get(uuid)?.(part(uuid, `Part ${uuid}`)),
      );
      await Promise.all(requests);
    });

    await expect(catalog.result.current.loadPart("part-1")).resolves.toMatchObject({
      uuid: "part-1",
    });
    expect(requestJsonMock).toHaveBeenCalledTimes(6);
  });
});
