"use client";

import type { Configuration } from "@/domains/configurations/types";
import type { PartWorkbenchModel } from "@/features/api-explorer/hooks/use-part-workbench";
import { AvailableTransitions } from "../available-transitions/available-transitions";
import { cx } from "../class-names";
import { OccurrenceCard } from "../occurrence-card/occurrence-card";
import { PartSummary } from "../part-summary/part-summary";
import { SharedPartConfirmation } from "../shared-part-confirmation/shared-part-confirmation";
import type {
  PartChangeIntent,
  SharedPartConfirmationActions,
  SharedPartConfirmationModel,
  TransitionActions,
  TransitionViewModel,
  UnitEditorModel,
} from "../part-workbench-models";
import panelStyles from "../panel.module.css";
import controlStyles from "../controls.module.css";
import feedbackStyles from "../feedback.module.css";
import styles from "./part-workbench.module.css";
import { TechnicalDetails } from "../technical-details/technical-details";

const classNames = {
  ...panelStyles,
  ...controlStyles,
  ...feedbackStyles,
  ...styles,
};

type PartWorkbenchContext = {
  machine: Configuration | null;
  occurrence: Configuration | null;
  path: string[];
};

type PartWorkbenchNavigation = {
  backToAssembly: () => void;
};

type PartWorkbenchProps = {
  model: PartWorkbenchModel;
  context: PartWorkbenchContext;
  navigation: PartWorkbenchNavigation;
};

export function PartWorkbench({
  model,
  context,
  navigation,
}: PartWorkbenchProps) {
  const { machine: selectedMachine, occurrence: selectedConfiguration, path: selectedPath } = context;
  const {
    part,
    partLoading,
    partError,
    allowableStatuses,
    statusChoicesCurrent,
    statusesLoading,
    statusesError,
    unitDraft,
    statusDraft,
    editMode,
    confirmSharedUpdate,
    updatePending,
    updateError,
    updateSuccess,
    uncertainUpdate,
    verificationMessage,
    outcomeCheckPending,
    checkUpdateOutcome,
    refreshPartAndStatuses,
    changeUnit,
    beginStatusChange,
    beginUnitChange,
    cancelUpdate,
    reviewUpdate,
    submitUpdate,
  } = model;

  const updateLocked =
    updatePending ||
    uncertainUpdate !== null ||
    outcomeCheckPending;
  const editLocked = updateLocked || partLoading || statusesLoading;
  const unitChange = unitDraft.trim();
  const canReviewUnit = Boolean(part && unitChange && unitChange !== part.unit);
  const canSubmitStatus =
    Boolean(
      confirmSharedUpdate &&
        editMode === "status" &&
        part &&
        statusDraft &&
        !statusesLoading &&
        !statusesError &&
        statusChoicesCurrent &&
        allowableStatuses?.allowableStatuses.includes(statusDraft) &&
        statusDraft !== part.status &&
        !editLocked,
    );
  const canSubmitUnit =
    Boolean(
      confirmSharedUpdate &&
        editMode === "unit" &&
        canReviewUnit &&
        !editLocked,
    );

  function getChangeIntent(mode: "status" | "unit"): PartChangeIntent | null {
    if (!part || editMode !== mode) {
      return null;
    }

    if (mode === "status" && statusDraft) {
      return {
        kind: "status",
        from: part.status,
        to: statusDraft,
      };
    }

    if (mode === "unit") {
      return {
        kind: "unit",
        from: part.unit,
        to: unitChange,
      };
    }

    return null;
  }

  function renderConfirmation(mode: "status" | "unit") {
    if (!part || !confirmSharedUpdate || editMode !== mode) {
      return null;
    }

    const change = getChangeIntent(mode);
    if (!change) {
      return null;
    }

    const view: SharedPartConfirmationModel = {
      part,
      change,
      machine: selectedMachine,
      occurrence: selectedConfiguration,
      path: selectedPath,
      error: updateError,
      pending: updatePending,
      canSubmit: mode === "status" ? canSubmitStatus : canSubmitUnit,
    };
    const actions: SharedPartConfirmationActions = {
      submit: submitUpdate,
      cancel: cancelUpdate,
    };

    return (
      <SharedPartConfirmation view={view} actions={actions} />
    );
  }

  const unitEditor: UnitEditorModel =
    editMode === "unit" && confirmSharedUpdate
      ? {
          state: "confirming",
          confirmation: renderConfirmation("unit"),
        }
      : editMode === "unit"
        ? {
            state: "editing",
            draft: unitDraft,
            error: updateError,
            disabled: editLocked,
            canReview: canReviewUnit,
            onChange: changeUnit,
            onReview: reviewUpdate,
            onCancel: cancelUpdate,
          }
        : {
            state: "view",
            disabled: editLocked,
            onBegin: beginUnitChange,
          };

  const transitionView: TransitionViewModel | null = part
    ? {
        choicesMatchPart: statusChoicesCurrent,
        allowableStatuses,
        loading: statusesLoading,
        error: statusesError,
        disabled: editLocked,
        selectionError:
          editMode === "status" && !confirmSharedUpdate ? updateError : null,
        confirmation: renderConfirmation("status"),
      }
    : null;
  const transitionActions: TransitionActions = {
    refreshChoices: refreshPartAndStatuses,
    retryChoices: refreshPartAndStatuses,
    refreshPart: refreshPartAndStatuses,
    select: beginStatusChange,
  };

  return (
    <section
      className={cx(
        classNames["panel"],
        classNames["part-panel"],
      )}
      data-panel="details"
      aria-labelledby="part-heading"
    >
      <div className={classNames["panel-header"]}>
        <div>
          <p className={classNames["panel-kicker"]}>SELECTED COMPONENT</p>
          <h2 className={classNames["panel-title"]} id="part-heading">
            Part details
          </h2>
          <p className={classNames["panel-description"]}>
            Inspect the part definition and its use in this machine.
          </p>
        </div>
        {selectedConfiguration && (
          <button
            className={cx(
              classNames["button"],
              classNames["button-quiet"],
              classNames["back-to-assembly"],
            )}
            type="button"
            onClick={navigation.backToAssembly}
            disabled={updatePending}
          >
            Back to assembly
          </button>
        )}
      </div>

      {uncertainUpdate && (
        <div className={classNames["error-box"]} role="alert">
          <div className={classNames["notice-copy"]}>
            <p>
              We couldn&apos;t confirm whether the update to{" "}
              {uncertainUpdate.partLabel} was applied. Part updates are paused
              until it is checked. You can keep browsing the assembly.
            </p>
            {verificationMessage && <p>{verificationMessage.text}</p>}
          </div>
          <button
            className={cx(classNames["button"], classNames["button-quiet"])}
            type="button"
            onClick={() => void checkUpdateOutcome()}
            disabled={outcomeCheckPending}
          >
            {outcomeCheckPending ? "Checking..." : "Check update"}
          </button>
        </div>
      )}
      {!uncertainUpdate && verificationMessage && (
        <p
          className={cx(
            classNames["workbench-notice"],
            verificationMessage.tone === "success"
              ? classNames["inline-success"]
              : classNames["inline-error"],
          )}
          role={verificationMessage.tone === "success" ? "status" : "alert"}
        >
          {verificationMessage.text}
        </p>
      )}

      {selectedMachine && selectedConfiguration && (
        <div className={classNames["occurrence-context"]}>
          <OccurrenceCard
            machine={selectedMachine}
            configuration={selectedConfiguration}
            path={selectedPath}
          />
        </div>
      )}

      {partLoading && (
        <p className={classNames["loading-copy"]} role="status">
          Loading part details...
        </p>
      )}
      {partError && (
        <div className={classNames["error-box"]} role="alert">
          <p>{partError}</p>
          <button
            className={cx(classNames["button"], classNames["button-quiet"])}
            type="button"
            onClick={refreshPartAndStatuses}
            disabled={partLoading || updatePending}
          >
            {partLoading ? "Checking..." : "Retry"}
          </button>
        </div>
      )}

      {part && (
        <div className={classNames["part-content"]}>
          <PartSummary
            part={part}
            unitEditor={unitEditor}
          />

          {transitionView && (
            <AvailableTransitions
              view={transitionView}
              actions={transitionActions}
            />
          )}

          {updateSuccess && (
            <p className={classNames["inline-success"]} role="status">
              {updateSuccess}
            </p>
          )}

          <TechnicalDetails
            part={part}
            configuration={selectedConfiguration}
          />
        </div>
      )}

      {!part && !partLoading && !partError && (
        <div className={classNames["empty-inspector"]}>
          <span className={classNames["empty-inspector-mark"]} aria-hidden="true">
            P
          </span>
          <h3>No part selected</h3>
          <p>Choose a machine and select a component in its assembly.</p>
        </div>
      )}
    </section>
  );
}
