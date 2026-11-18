// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Configuration } from "@/domains/configurations/types";
import { useConfigurationExplorer } from "./use-configuration-explorer";

const requestJsonMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/browser-client", () => ({
  requestJson: requestJsonMock,
  BrowserApiError: class BrowserApiError extends Error {
    constructor(
      readonly status: number,
      readonly body: { error?: string },
    ) {
      super(body.error ?? "Request failed");
    }
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function configuration(uuid: string, partUuid: string): Configuration {
  return { uuid, partUuid, quantity: 1 };
}

describe("useConfigurationExplorer", () => {
  it("loads child occurrences lazily and reuses them after collapse", async () => {
    const root = configuration("root-1", "part-1");
    const child = configuration("child-1", "part-2");
    requestJsonMock
      .mockResolvedValueOnce([root])
      .mockResolvedValueOnce([child]);

    const { result } = renderHook(() => useConfigurationExplorer(null));
    await waitFor(() => expect(result.current.roots).toEqual([root]));
    expect(requestJsonMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.toggleNode(root);
    });
    expect(result.current.childrenByParent[root.uuid]).toEqual([child]);
    expect(result.current.expandedIds.has(root.uuid)).toBe(true);
    expect(requestJsonMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.toggleNode(root);
    });
    expect(result.current.expandedIds.has(root.uuid)).toBe(false);
    await act(async () => {
      await result.current.toggleNode(root);
    });
    expect(result.current.expandedIds.has(root.uuid)).toBe(true);
    expect(requestJsonMock).toHaveBeenCalledTimes(2);
  });
});
