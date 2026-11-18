// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Part } from "@/domains/parts/types";
import { BrowserApiError } from "@/lib/api/browser-client";
import { usePartCatalog } from "./use-part-catalog";
import { usePartWorkbench } from "./use-part-workbench";

const requestJsonMock = vi.hoisted(() => vi.fn());
const BrowserApiErrorMock = vi.hoisted(
  () =>
    class BrowserApiErrorMock extends Error {
      constructor(
        readonly status: number,
        readonly body: { error?: string; allowableStatuses?: string[] },
      ) {
        super(body.error ?? "Request failed");
      }
    },
);

vi.mock("@/lib/api/browser-client", () => ({
  requestJson: requestJsonMock,
  BrowserApiError: BrowserApiErrorMock,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function part(uuid: string, name: string): Part {
  return {
    uuid,
    partNo: `TM-${uuid}`,
    name,
    status: "active",
    unit: "set",
  };
}

describe("usePartWorkbench", () => {
  it("does not let an older part response replace the latest selection", async () => {
    const firstPart = deferred<Part>();
    const secondPart = deferred<Part>();
    requestJsonMock.mockImplementation((path: string) => {
      if (path.endsWith("/part-first")) {
        return firstPart.promise;
      }
      if (path.endsWith("/part-second")) {
        return secondPart.promise;
      }
      if (path.endsWith("/allowable-statuses")) {
        return Promise.resolve({
          partUuid: "part-second",
          currentStatus: "active",
          allowableStatuses: [],
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    const catalog = renderHook(() => usePartCatalog());
    const workbench = renderHook(() =>
      usePartWorkbench(catalog.result.current),
    );

    act(() => {
      void workbench.result.current.lookupPart("part-first");
      void workbench.result.current.lookupPart("part-second");
    });

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/parts/part-first",
      );
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/parts/part-second",
      );
    });

    await act(async () => {
      secondPart.resolve(part("part-second", "Latest selection"));
      await secondPart.promise;
    });
    await waitFor(() =>
      expect(workbench.result.current.part?.uuid).toBe("part-second"),
    );

    await act(async () => {
      firstPart.resolve(part("part-first", "Older selection"));
      await firstPart.promise;
    });

    expect(workbench.result.current.part?.name).toBe("Latest selection");
  });

  it("confirms a returned status choice before submitting it", async () => {
    const activePart = part("part-status", "Power Cell");
    let currentStatus = activePart.status;
    requestJsonMock.mockImplementation(
      (path: string, init?: RequestInit) => {
        if (path.endsWith("/allowable-statuses")) {
          return Promise.resolve({
            partUuid: activePart.uuid,
            currentStatus,
            allowableStatuses: ["draft"],
          });
        }
        if (path.endsWith("/part-status") && init?.method === "PUT") {
          currentStatus = "draft";
          return Promise.resolve({ ...activePart, status: "draft" });
        }
        if (path.endsWith("/part-status")) {
          return Promise.resolve(activePart);
        }
        return Promise.reject(new Error(`Unexpected request: ${path}`));
      },
    );

    const catalog = renderHook(() => usePartCatalog());
    const workbench = renderHook(() =>
      usePartWorkbench(catalog.result.current),
    );
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;

    await act(async () => {
      await workbench.result.current.lookupPart(activePart.uuid);
    });
    await waitFor(() =>
      expect(workbench.result.current.allowableStatuses).not.toBeNull(),
    );
    await act(async () => {
      await workbench.result.current.beginStatusChange("draft");
    });
    expect(workbench.result.current.confirmSharedUpdate).toBe(true);

    await act(async () => {
      await workbench.result.current.submitUpdate(event);
    });
    expect(
      requestJsonMock.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(true);
    expect(workbench.result.current.part?.status).toBe("draft");
    expect(workbench.result.current.updateSuccess).toBe(
      "The service confirmed the part update.",
    );
    expect(catalog.result.current.partsByUuid[activePart.uuid]?.status).toBe(
      "draft",
    );
    await waitFor(() =>
      expect(workbench.result.current.allowableStatuses?.currentStatus).toBe(
        "draft",
      ),
    );
  });

  it("refreshes allowable transitions after the service rejects a status update", async () => {
    const activePart = part("part-rejected", "Power Cell");
    let statusReads = 0;
    requestJsonMock.mockImplementation(
      (path: string, init?: RequestInit) => {
        if (path.endsWith("/allowable-statuses")) {
          statusReads += 1;
          return Promise.resolve({
            partUuid: activePart.uuid,
            currentStatus: "active",
            allowableStatuses: statusReads <= 2 ? ["draft"] : ["experimental"],
          });
        }
        if (path.endsWith("/part-rejected") && init?.method === "PUT") {
          return Promise.reject(
            new BrowserApiError(400, { error: "Invalid status change" }),
          );
        }
        if (path.endsWith("/part-rejected")) {
          return Promise.resolve(activePart);
        }
        return Promise.reject(new Error(`Unexpected request: ${path}`));
      },
    );

    const catalog = renderHook(() => usePartCatalog());
    const workbench = renderHook(() =>
      usePartWorkbench(catalog.result.current),
    );
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;
    await act(async () => {
      await workbench.result.current.lookupPart(activePart.uuid);
    });
    await waitFor(() =>
      expect(workbench.result.current.allowableStatuses).not.toBeNull(),
    );
    await act(async () => {
      await workbench.result.current.beginStatusChange("draft");
    });
    await act(async () => {
      await workbench.result.current.submitUpdate(event);
    });
    await waitFor(() =>
      expect(
        workbench.result.current.allowableStatuses?.allowableStatuses,
      ).toEqual(["experimental"]),
    );

    expect(workbench.result.current.confirmSharedUpdate).toBe(false);
    expect(workbench.result.current.updateError).toMatch(/status change was rejected/i);
    expect(
      requestJsonMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);
  });

  it("verifies the part after a lost update response instead of retrying the mutation", async () => {
    const activePart = part("part-uncertain", "Power Cell");
    let currentStatus = activePart.status;
    let partReads = 0;
    requestJsonMock.mockImplementation(
      (path: string, init?: RequestInit) => {
        if (path.endsWith("/allowable-statuses")) {
          return Promise.resolve({
            partUuid: activePart.uuid,
            currentStatus,
            allowableStatuses: ["draft"],
          });
        }
        if (path.endsWith("/part-uncertain") && init?.method === "PUT") {
          currentStatus = "draft";
          return Promise.reject(
            new BrowserApiError(0, {
              error: "Could not reach the application API.",
            }),
          );
        }
        if (path.endsWith("/part-uncertain")) {
          partReads += 1;
          return Promise.resolve({ ...activePart, status: currentStatus });
        }
        return Promise.reject(new Error(`Unexpected request: ${path}`));
      },
    );

    const catalog = renderHook(() => usePartCatalog());
    const workbench = renderHook(() =>
      usePartWorkbench(catalog.result.current),
    );
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;

    await act(async () => {
      await workbench.result.current.lookupPart(activePart.uuid);
    });
    await waitFor(() =>
      expect(workbench.result.current.allowableStatuses).not.toBeNull(),
    );
    await act(async () => {
      await workbench.result.current.beginStatusChange("draft");
    });

    await act(async () => {
      await workbench.result.current.submitUpdate(event);
    });

    expect(partReads).toBe(3);
    expect(
      requestJsonMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);
    expect(workbench.result.current.uncertainUpdate).toBeNull();
    expect(workbench.result.current.part?.status).toBe("draft");
    expect(workbench.result.current.verificationMessage).toEqual({
      tone: "success",
      text: "The current details of Power Cell (TM-part-uncertain) confirm the update was applied.",
    });
  });

  it("keeps updates blocked when the outcome cannot be verified, then retries only the read", async () => {
    const activePart = part("part-unverified", "Power Cell");
    let partReads = 0;
    requestJsonMock.mockImplementation(
      (path: string, init?: RequestInit) => {
        if (path.endsWith("/allowable-statuses")) {
          return Promise.resolve({
            partUuid: activePart.uuid,
            currentStatus: "active",
            allowableStatuses: ["draft"],
          });
        }
        if (path.endsWith("/part-unverified") && init?.method === "PUT") {
          return Promise.reject(
            new BrowserApiError(0, { error: "Network unavailable." }),
          );
        }
        if (path.endsWith("/part-unverified")) {
          partReads += 1;
          if (partReads === 3) {
            return Promise.reject(
              new BrowserApiError(0, { error: "Network unavailable." }),
            );
          }
          return Promise.resolve(activePart);
        }
        return Promise.reject(new Error(`Unexpected request: ${path}`));
      },
    );

    const catalog = renderHook(() => usePartCatalog());
    const workbench = renderHook(() =>
      usePartWorkbench(catalog.result.current),
    );
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;

    await act(async () => {
      await workbench.result.current.lookupPart(activePart.uuid);
    });
    await waitFor(() =>
      expect(workbench.result.current.allowableStatuses).not.toBeNull(),
    );
    await act(async () => {
      await workbench.result.current.beginStatusChange("draft");
    });
    await act(async () => {
      await workbench.result.current.submitUpdate(event);
    });

    expect(workbench.result.current.uncertainUpdate).toMatchObject({
      partUuid: activePart.uuid,
      input: { status: "draft" },
    });
    expect(workbench.result.current.verificationMessage?.text).toMatch(
      /still unverified/,
    );
    await act(async () => {
      await workbench.result.current.checkUpdateOutcome();
    });
    expect(workbench.result.current.uncertainUpdate).toBeNull();
    expect(workbench.result.current.verificationMessage?.text).toMatch(
      /do not reflect the requested update/,
    );
    expect(
      requestJsonMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);
  });

  it("allows browsing other parts but keeps writes paused until a lost update is checked", async () => {
    const lostPart = part("part-lost", "Power Cell");
    const otherPart = part("part-other", "Flux Coupler");
    let lostReads = 0;
    requestJsonMock.mockImplementation(
      (path: string, init?: RequestInit) => {
        if (path.endsWith("/allowable-statuses")) {
          return Promise.resolve({
            partUuid: path.includes("part-lost") ? lostPart.uuid : otherPart.uuid,
            currentStatus: "active",
            allowableStatuses: ["draft"],
          });
        }
        if (path.endsWith("/part-lost") && init?.method === "PUT") {
          return Promise.reject(new BrowserApiError(0, { error: "Network unavailable." }));
        }
        if (path.endsWith("/part-lost")) {
          lostReads += 1;
          if (lostReads <= 2) {
            return Promise.resolve(lostPart);
          }
          return lostReads === 3
            ? Promise.reject(new BrowserApiError(0, { error: "Network unavailable." }))
            : Promise.resolve({ ...lostPart, status: "draft" as const });
        }
        if (path.endsWith("/part-other")) {
          return Promise.resolve(otherPart);
        }
        return Promise.reject(new Error(`Unexpected request: ${path}`));
      },
    );

    const catalog = renderHook(() => usePartCatalog());
    const workbench = renderHook(() =>
      usePartWorkbench(catalog.result.current),
    );
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;

    await act(async () => {
      await workbench.result.current.lookupPart(lostPart.uuid);
    });
    await waitFor(() =>
      expect(workbench.result.current.statusChoicesCurrent).toBe(true),
    );
    await act(async () => {
      await workbench.result.current.beginStatusChange("draft");
    });
    await act(async () => {
      await workbench.result.current.submitUpdate(event);
    });
    expect(workbench.result.current.uncertainUpdate?.partUuid).toBe(lostPart.uuid);

    await act(async () => {
      await workbench.result.current.lookupPart(otherPart.uuid);
    });
    await waitFor(() =>
      expect(workbench.result.current.statusChoicesCurrent).toBe(true),
    );
    expect(workbench.result.current.part?.uuid).toBe(otherPart.uuid);
    expect(workbench.result.current.uncertainUpdate?.partUuid).toBe(lostPart.uuid);

    await act(async () => {
      await workbench.result.current.beginStatusChange("draft");
    });
    expect(workbench.result.current.confirmSharedUpdate).toBe(false);

    await act(async () => {
      await workbench.result.current.checkUpdateOutcome();
    });
    expect(workbench.result.current.uncertainUpdate).toBeNull();
    expect(workbench.result.current.verificationMessage?.tone).toBe("success");
    expect(workbench.result.current.part?.uuid).toBe(otherPart.uuid);
    expect(catalog.result.current.partsByUuid[lostPart.uuid]?.status).toBe("draft");
    expect(
      requestJsonMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);
  });

  it("shows a pending state and ignores duplicate status submissions", async () => {
    const activePart = part("part-slow", "Power Cell");
    const pendingUpdate = deferred<Part>();
    requestJsonMock.mockImplementation(
      (path: string, init?: RequestInit) => {
        if (path.endsWith("/allowable-statuses")) {
          return Promise.resolve({
            partUuid: activePart.uuid,
            currentStatus: "active",
            allowableStatuses: ["draft"],
          });
        }
        if (path.endsWith("/part-slow") && init?.method === "PUT") {
          return pendingUpdate.promise;
        }
        if (path.endsWith("/part-slow")) {
          return Promise.resolve(activePart);
        }
        return Promise.reject(new Error(`Unexpected request: ${path}`));
      },
    );

    const catalog = renderHook(() => usePartCatalog());
    const workbench = renderHook(() =>
      usePartWorkbench(catalog.result.current),
    );
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;
    await act(async () => {
      await workbench.result.current.lookupPart(activePart.uuid);
    });
    await waitFor(() =>
      expect(workbench.result.current.allowableStatuses).not.toBeNull(),
    );
    await act(async () => {
      await workbench.result.current.beginStatusChange("draft");
    });

    let firstSubmission!: Promise<void>;
    act(() => {
      firstSubmission = workbench.result.current.submitUpdate(event);
      void workbench.result.current.submitUpdate(event);
    });
    expect(workbench.result.current.updatePending).toBe(true);
    expect(
      requestJsonMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);

    await act(async () => {
      pendingUpdate.resolve({ ...activePart, status: "draft" });
      await firstSubmission;
    });
    expect(workbench.result.current.updatePending).toBe(false);
  });
});
