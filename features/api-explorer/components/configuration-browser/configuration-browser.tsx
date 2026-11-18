"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import type { Configuration } from "@/domains/configurations/types";
import type { Part } from "@/domains/parts/types";
import { ConfigurationTreeNode } from "../configuration-tree-node/configuration-tree-node";
import { cx } from "../class-names";
import panelStyles from "../panel.module.css";
import controlStyles from "../controls.module.css";
import feedbackStyles from "../feedback.module.css";
import treeStyles from "../configuration-tree-node/configuration-tree-node.module.css";
import styles from "./configuration-browser.module.css";
import { useConfigurationExplorer } from "../../hooks/use-configuration-explorer";

const classNames = {
  ...panelStyles,
  ...controlStyles,
  ...feedbackStyles,
  ...treeStyles,
  ...styles,
};

type ConfigurationBrowserSelection = {
  selectedMachineUuid: string | null;
  selectedConfigurationUuid: string | null;
};

type ConfigurationPartCatalogView = {
  partsByUuid: Record<string, Part>;
  loadingPartsByUuid: Record<string, boolean>;
  partErrorsByUuid: Record<string, string>;
  loadPart: (partUuid: string) => Promise<Part>;
};

type ConfigurationBrowserActions = {
  selectMachine: (configuration: Configuration | null) => void;
  selectConfiguration: (
    configuration: Configuration | null,
    path: string[],
  ) => void;
  updateSelectedPath: (path: string[]) => void;
};

type ConfigurationBrowserProps = {
  selection: ConfigurationBrowserSelection;
  partCatalog: ConfigurationPartCatalogView;
  disabled: boolean;
  actions: ConfigurationBrowserActions;
};

function getMachineLabel(configuration: Configuration): string {
  return configuration.endUnitSerialNo
    ? `Time Machine ${configuration.endUnitSerialNo}`
    : "Machine (serial number unavailable)";
}

export function ConfigurationBrowser({
  selection,
  partCatalog,
  disabled,
  actions,
}: ConfigurationBrowserProps) {
  const { selectedMachineUuid, selectedConfigurationUuid } = selection;
  const {
    partsByUuid,
    loadingPartsByUuid,
    partErrorsByUuid,
    loadPart: loadPartDefinition,
  } = partCatalog;
  const {
    selectMachine: onSelectMachine,
    selectConfiguration: onSelectConfiguration,
    updateSelectedPath: onUpdateSelectedPath,
  } = actions;
  const interactionDisabled = disabled;
  const [machineQuery, setMachineQuery] = useState("");
  // The input keeps showing the selected serial; it only filters once the technician types.
  const [machineQueryEdited, setMachineQueryEdited] = useState(false);
  const [machineListOpen, setMachineListOpen] = useState(false);
  const [highlightedMachineIndex, setHighlightedMachineIndex] = useState(0);

  const explorer = useConfigurationExplorer(selectedMachineUuid);
  const {
    roots,
    rootsLoading,
    rootsError,
    loadRoots,
    childrenByParent,
    loadingByParent,
    errorsByParent,
    expandedIds,
    toggleNode,
    retryChildren,
  } = explorer;

  const selectedMachine =
    roots?.find((root) => root.uuid === selectedMachineUuid) ?? null;
  const filteredRoots =
    roots?.filter((root) => {
      const serial = root.endUnitSerialNo?.toLocaleLowerCase() ?? "";
      const query = machineQueryEdited
        ? machineQuery.trim().toLocaleLowerCase()
        : "";
      return serial.includes(query);
    }) ?? [];

  function selectMachine(root: Configuration) {
    onSelectMachine(root);
    onSelectConfiguration(null, []);
    setMachineQuery(root.endUnitSerialNo ?? "");
    setMachineQueryEdited(false);
    setMachineListOpen(false);
    setHighlightedMachineIndex(0);
  }

  function handleMachineKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Escape") {
      setMachineListOpen(false);
      setMachineQuery(selectedMachine?.endUnitSerialNo ?? "");
      setMachineQueryEdited(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setMachineListOpen(true);
      if (filteredRoots.length > 0) {
        setHighlightedMachineIndex((index) =>
          event.key === "ArrowDown"
            ? (index + 1) % filteredRoots.length
            : (index - 1 + filteredRoots.length) % filteredRoots.length,
        );
      }
      return;
    }

    if (event.key === "Enter" && machineListOpen && filteredRoots.length > 0) {
      event.preventDefault();
      selectMachine(filteredRoots[highlightedMachineIndex] ?? filteredRoots[0]);
    }
  }

  const treeProps = {
    machineRootUuid: selectedMachineUuid ?? "",
    childrenByParent,
    loadingByParent,
    errorsByParent,
    partsByUuid,
    loadingPartsByUuid,
    partErrorsByUuid,
    expandedIds,
    selectedConfigurationUuid,
    interactionDisabled,
    onToggle: toggleNode,
    onRetry: (uuid: string) => void retryChildren(uuid),
    onLoadPart: loadPartDefinition,
    onRetryPart: (uuid: string) => void loadPartDefinition(uuid).catch(() => undefined),
    onUpdateSelectedPath,
    onSelect: onSelectConfiguration,
  };

  return (
    <section
      className={cx(
        classNames["panel"],
        classNames["configuration-panel"],
      )}
      data-panel="assembly"
      aria-labelledby="configuration-heading"
    >
      <div className={cx(classNames["panel-header"])}>
        <div>
          <p className={cx(classNames["panel-kicker"])}>ASSEMBLY EXPLORER</p>
          <h2 className={cx(classNames["panel-title"])} id="configuration-heading">
            Assembly structure
          </h2>
          <p className={cx(classNames["panel-description"])}>
            Find a machine, then follow its components through the assembly.
          </p>
        </div>
        <button
          className={cx(classNames["button"], classNames["button-quiet"])}
          type="button"
          onClick={() => void loadRoots()}
          disabled={rootsLoading || interactionDisabled}
        >
          {rootsLoading ? "Refreshing..." : "Refresh roots"}
        </button>
      </div>

      <div className={cx(classNames["machine-selector"])}>
        <label htmlFor="machine-combobox">Current machine</label>
        <div className={cx(classNames["machine-combobox"])}>
          <input
            id="machine-combobox"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={machineListOpen}
            aria-controls="machine-options"
            aria-activedescendant={
              machineListOpen && filteredRoots[highlightedMachineIndex]
                ? `machine-option-${filteredRoots[highlightedMachineIndex].uuid}`
                : undefined
            }
            value={machineQuery}
            onFocus={(event) => {
              event.currentTarget.select();
              setMachineQueryEdited(false);
              setHighlightedMachineIndex(0);
              setMachineListOpen(true);
            }}
            onChange={(event) => {
              setMachineQuery(event.target.value);
              setMachineQueryEdited(true);
              setHighlightedMachineIndex(0);
              setMachineListOpen(true);
            }}
            onKeyDown={handleMachineKeyDown}
            onBlur={() => {
              setMachineListOpen(false);
              if (selectedMachine) {
                setMachineQuery(selectedMachine.endUnitSerialNo ?? "");
                setMachineQueryEdited(false);
              }
            }}
            placeholder="Search by serial number"
            autoComplete="off"
            disabled={!roots || roots.length === 0 || interactionDisabled}
          />
          {machineListOpen && roots && roots.length > 0 && (
            <ul
              className={cx(classNames["machine-options"])}
              id="machine-options"
              role="listbox"
              aria-label="Returned machines"
            >
              {filteredRoots.length > 0 ? (
                filteredRoots.map((root, index) => (
                  <li
                    key={root.uuid}
                    className={
                      index === highlightedMachineIndex
                        ? classNames["machine-option-highlighted"]
                        : undefined
                    }
                    id={`machine-option-${root.uuid}`}
                    role="option"
                    aria-selected={selectedMachineUuid === root.uuid}
                    onMouseDown={(event) => event.preventDefault()}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => selectMachine(root)}
                  >
                    {getMachineLabel(root)}
                  </li>
                ))
              ) : (
                <li
                  className={cx(classNames["machine-option-empty"])}
                  role="option"
                  aria-selected="false"
                  aria-disabled="true"
                >
                  No returned machines match that serial number.
                </li>
              )}
            </ul>
          )}
        </div>
        {selectedMachine && (
          <p className={cx(classNames["selected-machine-label"])}>
            Selected: <strong>{getMachineLabel(selectedMachine)}</strong>
          </p>
        )}
        {roots && (
          <p className={cx(classNames["machine-list-note"])}>
            Showing {filteredRoots.length} of {roots.length} machines returned.
            The service does not indicate whether this is the full fleet.
          </p>
        )}
      </div>

      <div className={cx(classNames["root-list"])}>
        {rootsLoading && roots === null && (
          <p className={cx(classNames["loading-copy"])} role="status">
            Loading machines...
          </p>
        )}
        {rootsLoading && roots !== null && (
          <p className={cx(classNames["loading-copy"])} role="status">
            Refreshing the returned machine list...
          </p>
        )}
        {rootsError && (
          <div className={cx(classNames["error-box"])} role="alert">
            <p>{rootsError}</p>
            <button
              className={cx(classNames["button"], classNames["button-quiet"])}
              type="button"
              onClick={() => void loadRoots()}
              disabled={rootsLoading || interactionDisabled}
            >
              Retry
            </button>
          </div>
        )}
        {roots && roots.length === 0 && (
          <p className={cx(classNames["empty-copy"])}>No machines were returned by the service.</p>
        )}
        {roots && roots.length > 0 && filteredRoots.length === 0 && (
          <p className={cx(classNames["empty-copy"])}>
            No returned machines match that serial number.
          </p>
        )}
        {selectedMachine && (
          <>
            <div className={cx(classNames["machine-context"])}>
              <p className={cx(classNames["panel-kicker"])}>CURRENT MACHINE</p>
              <h3>{getMachineLabel(selectedMachine)}</h3>
            </div>
            <ul className={cx(classNames["configuration-tree-list"])}>
              <ConfigurationTreeNode
                key={selectedMachine.uuid}
                node={selectedMachine}
                depth={0}
                path={[]}
                {...treeProps}
              />
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
