"use client";

import type { Part } from "@/domains/parts/types";
import type { UnitEditorModel } from "../part-workbench-models";
import { cx } from "../class-names";
import panelStyles from "../panel.module.css";
import controlStyles from "../controls.module.css";
import feedbackStyles from "../feedback.module.css";
import styles from "./part-summary.module.css";

const classNames = {
  ...panelStyles,
  ...controlStyles,
  ...feedbackStyles,
  ...styles,
};

type PartSummaryProps = {
  part: Part;
  unitEditor: UnitEditorModel;
};

export function PartSummary({ part, unitEditor }: PartSummaryProps) {
  return (
    <section className={classNames["part-summary"]}>
      <div className={classNames["part-summary-heading"]}>
        <div>
          <p className={classNames["panel-kicker"]}>PART DEFINITION</p>
          <h3>{part.name}</h3>
          <p className={classNames["part-number"]}>{part.partNo}</p>
        </div>
        <div className={classNames["part-status-block"]}>
          <span>Current status</span>
          <strong className={classNames["status-current"]}>
            <span aria-hidden="true">●</span> {part.status}
          </strong>
        </div>
      </div>
      <dl className={classNames["part-facts"]}>
        <div>
          <dt>Unit of measure</dt>
          <dd>{part.unit}</dd>
          {unitEditor.state === "editing" ? (
            <form
              className={classNames["unit-edit-form"]}
              onSubmit={unitEditor.onReview}
            >
              <label htmlFor="part-unit">New unit of measure</label>
              <input
                id="part-unit"
                type="text"
                value={unitEditor.draft}
                onChange={(event) => unitEditor.onChange(event.target.value)}
                disabled={unitEditor.disabled}
              />
              {unitEditor.error && (
                <p className={cx(classNames["inline-error"], classNames["unit-edit-error"])} role="alert">
                  {unitEditor.error}
                </p>
              )}
              <div className={cx(classNames["form-actions"], classNames["unit-edit-actions"])}>
                <button
                  className={cx(
                    classNames["button"],
                    classNames["button-primary"],
                    classNames["unit-edit-action-button"],
                  )}
                  type="submit"
                  disabled={!unitEditor.canReview || unitEditor.disabled}
                >
                  Review unit change
                </button>
                <button
                  className={cx(
                    classNames["button"],
                    classNames["button-quiet"],
                    classNames["unit-edit-action-button"],
                  )}
                  type="button"
                  onClick={unitEditor.onCancel}
                  disabled={unitEditor.disabled}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : unitEditor.state === "confirming" ? (
            unitEditor.confirmation
          ) : (
            <button
              className={cx(classNames["button"], classNames["button-secondary"], classNames["unit-edit-button"])}
              type="button"
              onClick={unitEditor.onBegin}
              disabled={unitEditor.disabled}
            >
              Change unit
            </button>
          )}
        </div>
      </dl>
    </section>
  );
}
