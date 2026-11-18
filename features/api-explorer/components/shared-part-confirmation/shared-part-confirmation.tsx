"use client";

import { cx } from "../class-names";
import panelStyles from "../panel.module.css";
import controlStyles from "../controls.module.css";
import feedbackStyles from "../feedback.module.css";
import styles from "./shared-part-confirmation.module.css";
import type {
  SharedPartConfirmationActions,
  SharedPartConfirmationModel,
} from "../part-workbench-models";

const classNames = {
  ...panelStyles,
  ...controlStyles,
  ...feedbackStyles,
  ...styles,
};

type SharedPartConfirmationProps = {
  view: SharedPartConfirmationModel;
  actions: SharedPartConfirmationActions;
};

export function SharedPartConfirmation({
  view,
  actions,
}: SharedPartConfirmationProps) {
  return (
    <form
      className={classNames["confirmation-panel"]}
      onSubmit={actions.submit}
    >
      <p
        className={cx(
          classNames["panel-kicker"],
          classNames["confirmation-kicker"],
        )}
      >
        CONFIRM PART DEFINITION CHANGE
      </p>
      <h3>
        {view.change.kind === "status" ? "Change status?" : "Change unit?"}
      </h3>
      <p>
        Change {view.part.name} ({view.part.partNo}) from{" "}
        {view.change.from} to {view.change.to}?
      </p>
      <p
        className={cx(
          classNames["shared-part-warning"],
          classNames["confirmation-warning"],
        )}
      >
        This updates the shared part definition and may affect every
        configuration that uses it—not only this machine.
      </p>
      {view.occurrence && (
        <p className={classNames["confirmation-context"]}>
          Selected occurrence:{" "}
          {view.machine?.endUnitSerialNo
            ? `Time Machine ${view.machine.endUnitSerialNo} · `
            : ""}
          {view.path.join(" / ")} · quantity {view.occurrence.quantity}
        </p>
      )}
      {view.error && (
        <p className={classNames["inline-error"]} role="alert">
          {view.error}
        </p>
      )}
      <div className={classNames["form-actions"]}>
        <button
          className={cx(classNames["button"], classNames["button-quiet"])}
          type="button"
          onClick={actions.cancel}
          disabled={view.pending}
        >
          Cancel
        </button>
        <button
          className={cx(classNames["button"], classNames["button-primary"])}
          type="submit"
          disabled={!view.canSubmit}
        >
          {view.pending ? "Updating..." : "Confirm update"}
        </button>
      </div>
    </form>
  );
}
