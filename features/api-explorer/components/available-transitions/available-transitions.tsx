"use client";

import { cx } from "../class-names";
import panelStyles from "../panel.module.css";
import controlStyles from "../controls.module.css";
import feedbackStyles from "../feedback.module.css";
import styles from "./available-transitions.module.css";
import type {
  TransitionActions,
  TransitionViewModel,
} from "../part-workbench-models";

const classNames = {
  ...panelStyles,
  ...controlStyles,
  ...feedbackStyles,
  ...styles,
};

type AvailableTransitionsProps = {
  view: TransitionViewModel;
  actions: TransitionActions;
};

export function AvailableTransitions({
  view,
  actions,
}: AvailableTransitionsProps) {
  const availableTransitions =
    view.allowableStatuses?.allowableStatuses.filter(
      (status) => status !== view.allowableStatuses?.currentStatus,
    ) ?? [];
  const canChangeStatus =
    !view.loading &&
    !view.error &&
    view.choicesMatchPart &&
    availableTransitions.length > 0 &&
    !view.disabled;

  return (
    <section
      className={classNames["transition-section"]}
      aria-labelledby="status-heading"
    >
      <div className={classNames["transition-heading"]}>
        <div>
          <h3 id="status-heading">Available transitions</h3>
          <p className={classNames["helper-copy"]}>
            The service determines which next statuses are allowed.
          </p>
        </div>
        <button
          className={cx(classNames["button"], classNames["button-quiet"])}
          type="button"
          onClick={actions.refreshChoices}
          disabled={view.loading || view.disabled}
        >
          {view.loading ? "Checking..." : "Refresh choices"}
        </button>
      </div>

      {view.loading && (
        <p className={classNames["loading-copy"]} role="status">
          Checking allowed statuses...
        </p>
      )}
      {view.error && (
        <div className={classNames["status-load-error"]} role="alert">
          <p>{view.error}</p>
          <button
            className={cx(classNames["button"], classNames["button-quiet"])}
            type="button"
            onClick={actions.retryChoices}
            disabled={view.loading || view.disabled}
          >
            Retry status choices
          </button>
        </div>
      )}
      {view.allowableStatuses && (
        <div className={classNames["transition-result"]} aria-live="polite">
          <p>
            Available for current status{" "}
            <strong>{view.allowableStatuses.currentStatus}</strong>
          </p>
          {availableTransitions.length > 0 ? (
            <div className={classNames["status-chip-list"]}>
              {availableTransitions.map((status) => (
                <button
                  className={classNames["status-chip"]}
                  key={status}
                  type="button"
                  aria-label={`Change status to ${status}`}
                  onClick={() => actions.select(status)}
                  disabled={!canChangeStatus}
                >
                  {status}
                </button>
              ))}
            </div>
          ) : (
            <p className={classNames["empty-copy"]}>
              No status transitions are currently allowed.
            </p>
          )}
          {!view.choicesMatchPart && (
            <div className={classNames["status-load-error"]} role="alert">
              <p>
                The loaded part and service status differ. Refresh both before
                making a status change.
              </p>
              <button
                className={cx(classNames["button"], classNames["button-quiet"])}
                type="button"
                onClick={actions.refreshPart}
                disabled={view.disabled}
              >
                Refresh part details
              </button>
            </div>
          )}
        </div>
      )}
      {view.selectionError && (
        <p className={classNames["inline-error"]} role="alert">
          {view.selectionError}
        </p>
      )}
      {view.confirmation}
    </section>
  );
}
