"use client";

import { useCallback, useState } from "react";
import type { Configuration } from "@/domains/configurations/types";
import { ConfigurationBrowser } from "@/features/api-explorer/components/configuration-browser/configuration-browser";
import { HealthPanel } from "@/features/api-explorer/components/health-panel/health-panel";
import { PartWorkbench } from "@/features/api-explorer/components/part-workbench/part-workbench";
import { usePartCatalog } from "@/features/api-explorer/hooks/use-part-catalog";
import { usePartWorkbench } from "@/features/api-explorer/hooks/use-part-workbench";
import { cx } from "./components/class-names";
import panelStyles from "./components/panel.module.css";
import controlStyles from "./components/controls.module.css";
import feedbackStyles from "./components/feedback.module.css";
import styles from "./api-explorer.module.css";

const classNames = {
  ...panelStyles,
  ...controlStyles,
  ...feedbackStyles,
  ...styles,
};

export function ApiExplorer() {
  const [selectedMachine, setSelectedMachine] =
    useState<Configuration | null>(null);
  const [selectedConfiguration, setSelectedConfiguration] =
    useState<Configuration | null>(null);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const partCatalog = usePartCatalog();
  const partWorkbench = usePartWorkbench(partCatalog);

  function selectMachine(configuration: Configuration | null) {
    setSelectedMachine(configuration);
    setMobileDetailsOpen(false);
  }

  function selectConfiguration(
    configuration: Configuration | null,
    path: string[],
  ) {
    setSelectedConfiguration(configuration);
    setSelectedPath(path);
    setMobileDetailsOpen(configuration !== null);
    if (configuration) {
      void partWorkbench.lookupPart(configuration.partUuid);
    } else {
      partWorkbench.clearSelection();
    }
  }

  const updateSelectedPath = useCallback((path: string[]) => {
    setSelectedPath((current) =>
      current.length === path.length &&
      current.every((segment, index) => segment === path[index])
        ? current
        : path,
    );
  }, []);

  return (
    <main className={cx(classNames["control-page"])}>
      <header className={cx(classNames["app-header"])}>
        <div className={cx(classNames["brand-lockup"])}>
          <div className={cx(classNames["brand-mark"])} aria-hidden="true">
            C
          </div>
          <div>
            <p className={cx(classNames["brand-eyebrow"])}>CHRONOS INDUSTRIES</p>
            <p className={cx(classNames["brand-name"])}>Temporal Control</p>
          </div>
        </div>
        <p className={cx(classNames["service-context"])}>Assembly maintenance</p>
      </header>

      <section className={cx(classNames["welcome-panel"])}>
        <div className={cx(classNames["welcome-copy"])}>
          <p className={cx(classNames["welcome-eyebrow"])}>MACHINE ASSEMBLY EXPLORER</p>
          <h1>Find a component. Understand what you&apos;re changing.</h1>
          <p>
            Select a machine by serial number, follow its assembly, and inspect
            a part before making an allowed update.
          </p>
        </div>
      </section>

      <div
        className={cx(
          classNames["explorer-grid"],
          selectedConfiguration && classNames["has-selection"],
          mobileDetailsOpen && classNames["show-details"],
        )}
      >
        <ConfigurationBrowser
          selection={{
            selectedMachineUuid: selectedMachine?.uuid ?? null,
            selectedConfigurationUuid: selectedConfiguration?.uuid ?? null,
          }}
          partCatalog={{
            partsByUuid: partCatalog.partsByUuid,
            loadingPartsByUuid: partCatalog.loadingPartsByUuid,
            partErrorsByUuid: partCatalog.partErrorsByUuid,
            loadPart: partCatalog.loadPart,
          }}
          disabled={partWorkbench.updatePending}
          actions={{
            selectMachine,
            selectConfiguration,
            updateSelectedPath,
          }}
        />
        <PartWorkbench
          model={partWorkbench}
          context={{
            machine: selectedMachine,
            occurrence: selectedConfiguration,
            path: selectedPath,
          }}
          navigation={{
            backToAssembly: () => setMobileDetailsOpen(false),
          }}
        />
      </div>

      <details className={cx(classNames["diagnostics-disclosure"], classNames["service-diagnostics"])}>
        <summary>Advanced diagnostics: service health</summary>
        <HealthPanel />
      </details>

      <footer className={cx(classNames["control-footer"])}>
        <span>Part definitions may be shared across multiple machines.</span>
        <span>Only service-returned status changes can be selected.</span>
      </footer>
    </main>
  );
}
