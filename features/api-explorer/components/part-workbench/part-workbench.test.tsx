// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Configuration } from "@/domains/configurations/types";
import { BrowserApiError } from "@/lib/api/browser-client";
import { PartWorkbench } from "./part-workbench";
import { usePartCatalog } from "../../hooks/use-part-catalog";
import { usePartWorkbench } from "../../hooks/use-part-workbench";

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

const machine: Configuration = {
  uuid: "machine-uuid",
  partUuid: "assembly-uuid",
  quantity: 1,
  endUnitSerialNo: "00001",
};

const occurrence: Configuration = {
  uuid: "occurrence-uuid",
  partUuid: "part-uuid",
  quantity: 4,
};

function PartWorkbenchHarness({ partUuid = "part-uuid" }: { partUuid?: string }) {
  const catalog = usePartCatalog();
  const model = usePartWorkbench(catalog);
  const { lookupPart } = model;

  useEffect(() => {
    void lookupPart(partUuid);
  }, [lookupPart, partUuid]);

  return (
    <PartWorkbench
      model={model}
      context={{
        machine,
        occurrence,
        path: ["Time Machine 00001", "Power Cell · TM-1020"],
      }}
      navigation={{
        backToAssembly: vi.fn(),
      }}
    />
  );
}

function currentStatusText() {
  return screen.getByText("Current status").parentElement?.textContent;
}

describe("PartWorkbench", () => {
  it("separates the current status from the available transitions", async () => {
    requestJsonMock.mockImplementation((path: string) => {
      if (path.endsWith("/allowable-statuses")) {
        return Promise.resolve({
          partUuid: "part-uuid",
          currentStatus: "active",
          allowableStatuses: ["active", "draft", "experimental"],
        });
      }

      return Promise.resolve({
        uuid: "part-uuid",
        partNo: "TM-1020",
        name: "Power Cell",
        unit: "set",
        status: "active",
      });
    });

    render(<PartWorkbenchHarness />);
    expect(await screen.findByText("Current status")).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: "Available transitions" }),
    ).toBeTruthy();
    await waitFor(() => expect(screen.getByText("experimental")).toBeTruthy());

    expect(currentStatusText()).toContain("active");
    expect(
      screen.getAllByRole("button", { name: /Change status to/ }).map((button) =>
        button.textContent,
      ),
    ).toEqual(["draft", "experimental"]);
    expect(screen.queryByRole("button", { name: "Change status" })).toBeNull();
  });

  it("opens shared-update confirmation by selecting an available transition", async () => {
    let partReads = 0;
    let statusReads = 0;
    requestJsonMock.mockImplementation((path: string) => {
      if (path.endsWith("/allowable-statuses")) {
        statusReads += 1;
        return Promise.resolve({
          partUuid: "part-uuid",
          currentStatus: "active",
          allowableStatuses: ["draft"],
        });
      }

      partReads += 1;
      return Promise.resolve({
        uuid: "part-uuid",
        partNo: "TM-1020",
        name: "Power Cell",
        unit: "set",
        status: "active",
      });
    });

    render(<PartWorkbenchHarness />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Change status to draft" }),
    );

    expect(await screen.findByRole("heading", { name: "Change status?" })).toBeTruthy();
    expect(screen.getByText(/shared part definition/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Confirm update" }),
    ).toBeTruthy();
    expect(partReads).toBe(2);
    expect(statusReads).toBe(2);
  });

  it("does not open confirmation if a transition is no longer allowed", async () => {
    let statusReads = 0;
    requestJsonMock.mockImplementation((path: string) => {
      if (path.endsWith("/allowable-statuses")) {
        statusReads += 1;
        return Promise.resolve({
          partUuid: "part-uuid",
          currentStatus: "active",
          allowableStatuses: statusReads === 1 ? ["draft"] : ["experimental"],
        });
      }

      return Promise.resolve({
        uuid: "part-uuid",
        partNo: "TM-1020",
        name: "Power Cell",
        unit: "set",
        status: "active",
      });
    });

    render(<PartWorkbenchHarness />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Change status to draft" }),
    );

    expect(
      await screen.findByText(/That status is no longer available/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Change status to experimental" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Change status?" }),
    ).toBeNull();
    expect(
      requestJsonMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(0);
  });

  it("requires a fresh transition choice when the part status changed", async () => {
    let partReads = 0;
    let statusReads = 0;
    requestJsonMock.mockImplementation((path: string) => {
      if (path.endsWith("/allowable-statuses")) {
        statusReads += 1;
        const currentStatus = statusReads === 1 ? "active" : "draft";
        return Promise.resolve({
          partUuid: "part-uuid",
          currentStatus,
          allowableStatuses: [statusReads === 1 ? "draft" : "experimental"],
        });
      }

      partReads += 1;
      return Promise.resolve({
        uuid: "part-uuid",
        partNo: "TM-1020",
        name: "Power Cell",
        unit: "set",
        status: partReads === 1 ? "active" : "draft",
      });
    });

    render(<PartWorkbenchHarness />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Change status to draft" }),
    );

    expect(
      await screen.findByText(/part status changed since it was loaded/i),
    ).toBeTruthy();
    expect(currentStatusText()).toContain("draft");
    expect(
      screen.queryByRole("heading", { name: "Change status?" }),
    ).toBeNull();
    expect(
      requestJsonMock.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(0);
  });

  it("keeps unit editing beside the unit and submits the trimmed shared change", async () => {
    requestJsonMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path.endsWith("/allowable-statuses")) {
        return Promise.resolve({
          partUuid: "part-uuid",
          currentStatus: "active",
          allowableStatuses: [],
        });
      }

      return Promise.resolve({
        uuid: "part-uuid",
        partNo: "TM-1020",
        name: "Power Cell",
        unit: init?.method === "PUT" ? "pcs" : "set",
        status: "active",
      });
    });

    render(<PartWorkbenchHarness />);
    expect(await screen.findByText("Unit of measure")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "Change unit" }));

    const unitInput = screen.getByRole("textbox", {
      name: "New unit of measure",
    });
    fireEvent.change(unitInput, { target: { value: " set " } });
    expect(
      (screen.getByRole("button", { name: "Review unit change" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.change(unitInput, { target: { value: "  pcs  " } });
    fireEvent.click(screen.getByRole("button", { name: "Review unit change" }));

    expect(screen.getByRole("heading", { name: "Change unit?" })).toBeTruthy();
    expect(screen.getByText(/shared part definition/)).toBeTruthy();
    expect(screen.getByText(/from set to pcs\?/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm update" }));
    expect(
      await screen.findByText("The service confirmed the part update."),
    ).toBeTruthy();
    const putCalls = requestJsonMock.mock.calls.filter(
      ([, init]) => init?.method === "PUT",
    );
    expect(putCalls).toHaveLength(1);
    expect(JSON.parse(putCalls[0][1].body)).toEqual({ unit: "pcs" });
  });

  it("keeps the machine and occurrence visible when part details fail to load", async () => {
    requestJsonMock.mockRejectedValue(
      new BrowserApiError(500, { error: "Failed to fetch part" }),
    );
    render(<PartWorkbenchHarness />);

    expect(
      await screen.findByText("The service is temporarily unavailable. Try again."),
    ).toBeTruthy();
    expect(screen.getByText("Time Machine · Serial 00001")).toBeTruthy();
    expect(screen.getByText(/Quantity in this assembly/).textContent).toContain("4");
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("explains a missing part without displaying an HTTP code", async () => {
    requestJsonMock.mockRejectedValue(
      new BrowserApiError(404, { error: "Part not found" }),
    );
    render(<PartWorkbenchHarness />);

    expect(await screen.findByText("Part not found")).toBeTruthy();
    expect(screen.queryByText(/404/)).toBeNull();
  });
});
