// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Configuration } from "@/domains/configurations/types";
import type { Part } from "@/domains/parts/types";
import { BrowserApiError } from "@/lib/api/browser-client";
import { ConfigurationBrowser } from "./configuration-browser";

const requestJsonMock = vi.hoisted(() => vi.fn());
const selectConfigurationMock = vi.hoisted(() => vi.fn());
const selectMachineMock = vi.hoisted(() => vi.fn());
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

function configuration(
  uuid: string,
  partUuid: string,
  quantity: number,
  endUnitSerialNo?: string,
): Configuration {
  return {
    uuid,
    partUuid,
    quantity,
    endUnitSerialNo,
  };
}

const machine = configuration("root0001", "part0001", 1, "00001");
const cellOne = configuration("cell0001", "part0002", 4);
const cellTwo = configuration("cell0002", "part0002", 2);

const partsByUuid: Record<string, Part> = {
  part0001: {
    uuid: "part0001",
    partNo: "TM-1000",
    name: "Assembly",
    status: "active",
    unit: "set",
  },
  part0002: {
    uuid: "part0002",
    partNo: "TM-1020",
    name: "Power Cell",
    status: "active",
    unit: "set",
  },
};

function BrowserHarness() {
  const [selectedMachineUuid, setSelectedMachineUuid] = useState<string | null>(
    null,
  );
  const [selectedConfigurationUuid, setSelectedConfigurationUuid] = useState<
    string | null
  >(null);

  return (
    <ConfigurationBrowser
      selection={{
        selectedMachineUuid,
        selectedConfigurationUuid,
      }}
      partCatalog={{
        partsByUuid,
        loadingPartsByUuid: {},
        partErrorsByUuid: {},
        loadPart: vi.fn(async (uuid: string) => {
          const part = partsByUuid[uuid];
          if (!part) {
            throw new Error("Missing test part.");
          }
          return part;
        }),
      }}
      disabled={false}
      actions={{
        selectMachine: (root) => {
          setSelectedMachineUuid(root?.uuid ?? null);
          selectMachineMock(root);
        },
        selectConfiguration: (configuration, path) => {
          setSelectedConfigurationUuid(configuration?.uuid ?? null);
          selectConfigurationMock(configuration, path);
        },
        updateSelectedPath: vi.fn(),
      }}
    />
  );
}

describe("ConfigurationBrowser", () => {
  it("shows a distinct access error for a denied machine-list request", async () => {
    requestJsonMock
      .mockRejectedValueOnce(
        new BrowserApiError(403, { error: "Forbidden" }),
      )
      .mockResolvedValueOnce([machine]);
    render(<BrowserHarness />);

    expect(
      await screen.findByText("Access to the service was denied. Contact your administrator."),
    ).toBeTruthy();
    expect(screen.queryByText(/could not be reached/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/1 of 1 machines returned/)).toBeTruthy();
  });

  it("shows a connection message when the machine list cannot be reached", async () => {
    requestJsonMock.mockRejectedValue(
      new BrowserApiError(0, { error: "Network unavailable" }),
    );
    render(<BrowserHarness />);

    expect(
      await screen.findByText(
        "The service could not be reached. Check your connection and retry.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("keeps a failed child lookup local to its branch and can retry it", async () => {
    requestJsonMock
      .mockResolvedValueOnce([machine])
      .mockRejectedValueOnce(
        new BrowserApiError(500, { error: "Internal server error" }),
      )
      .mockResolvedValueOnce([cellOne]);
    render(<BrowserHarness />);

    const machineInput = await screen.findByRole("combobox", {
      name: "Current machine",
    });
    await screen.findByText(/1 of 1 machines returned/);
    fireEvent.focus(machineInput);
    fireEvent.click(
      await screen.findByRole("option", { name: "Time Machine 00001" }),
    );

    expect(
      await screen.findByText("The service is temporarily unavailable. Try again."),
    ).toBeTruthy();
    expect(screen.getAllByText("Time Machine 00001").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Qty 4")).toBeTruthy();
  });

  it("supports searching and selecting a machine with the combobox keyboard", async () => {
    const otherMachine = configuration("root0002", "part0001", 1, "00002");
    requestJsonMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/configs/children" ? [machine, otherMachine] : [],
      ),
    );
    render(<BrowserHarness />);

    const machineInput = await screen.findByRole("combobox", {
      name: "Current machine",
    });
    await screen.findByText(/2 of 2 machines returned/);
    fireEvent.change(machineInput, { target: { value: "00001" } });
    fireEvent.keyDown(machineInput, { key: "ArrowDown" });
    fireEvent.keyDown(machineInput, { key: "Enter" });

    expect(selectMachineMock).toHaveBeenCalledWith(machine);
    expect(screen.getByText("Selected:")).toBeTruthy();

    fireEvent.change(machineInput, { target: { value: "999" } });
    expect(machineInput.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(machineInput, { key: "Escape" });

    expect(machineInput.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect((machineInput as HTMLInputElement).value).toBe("00001");

    fireEvent.blur(machineInput);
    fireEvent.focus(machineInput);
    expect((machineInput as HTMLInputElement).value).toBe("00001");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("uses readable labels and occurrence quantities while keeping an empty leaf closed", async () => {
    requestJsonMock.mockImplementation((path: string) => {
      if (path === "/api/configs/children") {
        return Promise.resolve([machine]);
      }
      if (path.includes("parentUuid=root0001")) {
        return Promise.resolve([cellOne, cellTwo]);
      }
      if (path.includes("parentUuid=cell0001")) {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    render(<BrowserHarness />);

    const machineInput = await screen.findByRole("combobox", {
      name: "Current machine",
    });
    fireEvent.focus(machineInput);
    fireEvent.click(
      await screen.findByRole("option", { name: "Time Machine 00001" }),
    );

    const expandCells = await screen.findAllByRole("button", {
      name: "Check for child components of Power Cell · TM-1020",
    });
    expect(
      screen
        .getByText("Qty 4")
        .closest("[data-expansion-state]")
        ?.getAttribute("data-expansion-state"),
    ).toBe("unknown");
    expect(screen.getAllByText("Qty 4").length).toBe(1);
    expect(screen.getAllByText("Qty 2").length).toBe(1);
    expect(screen.getByText(/1 of 1 machines returned/)).toBeTruthy();
    expect(screen.getByText(/does not indicate whether this is the full fleet/)).toBeTruthy();

    const selectCell = screen.getByText("Qty 4").closest("button");
    expect(selectCell).not.toBeNull();
    fireEvent.click(selectCell as HTMLButtonElement);
    expect(selectConfigurationMock).toHaveBeenCalledWith(
      cellOne,
      ["Time Machine 00001", "Power Cell · TM-1020"],
    );
    expect(requestJsonMock).not.toHaveBeenCalledWith(
      "/api/configs/children?parentUuid=cell0001",
    );

    fireEvent.click(expandCells[0]);

    expect(
      await screen.findByRole("img", { name: "No further components" }),
    ).toBeTruthy();
    const leafRow = screen.getByText("Qty 4").closest("li");
    expect(leafRow).not.toBeNull();
    const row = within(leafRow as HTMLElement);
    expect(row.getByRole("img", { name: "No further components" })).toBeTruthy();
    expect(
      row.queryByRole("button", {
        name: "Check for child components of Power Cell · TM-1020",
      }),
    ).toBeNull();
    expect(requestJsonMock).toHaveBeenCalledWith(
      "/api/configs/children?parentUuid=cell0001",
    );
  });
});
