"use client";

import { useState } from "react";
import type { components } from "@/lib/api/generated";
import {
  BrowserApiError,
  requestJson,
} from "@/lib/api/browser-client";
import { cx } from "../class-names";
import panelStyles from "../panel.module.css";
import controlStyles from "../controls.module.css";
import feedbackStyles from "../feedback.module.css";
import styles from "./health-panel.module.css";

const classNames = {
  ...panelStyles,
  ...controlStyles,
  ...feedbackStyles,
  ...styles,
};

type HealthCheck = components["schemas"]["HealthCheck"];

export function HealthPanel() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkHealth() {
    setIsChecking(true);
    setError(null);

    try {
      setHealth(await requestJson<HealthCheck>("/api/health"));
    } catch (requestError) {
      setHealth(null);
      setError(
        requestError instanceof BrowserApiError
          ? requestError.message
          : "Could not check the service health.",
      );
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className={cx(classNames["panel"])} aria-labelledby="health-heading">
      <div className={cx(classNames["panel-header"])}>
        <div>
          <p className={cx(classNames["panel-kicker"])}>SERVICE CONNECTION</p>
          <h2 className={cx(classNames["panel-title"])} id="health-heading">
            Service health
          </h2>
        </div>
        <span
          className={cx(
            classNames["health-indicator"],
            health && classNames["health-indicator-online"],
          )}
          aria-live="polite"
        >
          <span className={cx(classNames["health-dot"])} aria-hidden="true" />
          {health ? "Online" : isChecking ? "Checking" : "Not checked"}
        </span>
      </div>

      <div className={cx(classNames["health-content"])}>
        <div className={cx(classNames["health-result"])} aria-live="polite">
          {health ? (
            <>
              <strong>{health.message}</strong>
              <span>Service response: {health.status}</span>
            </>
          ) : error ? (
            <p className={cx(classNames["inline-error"])} role="alert">
              {error}
            </p>
          ) : (
            <p>Run a health check to verify the service connection.</p>
          )}
        </div>
        <button
          className={cx(classNames["button"], classNames["button-secondary"])}
          type="button"
          onClick={checkHealth}
          disabled={isChecking}
        >
          {isChecking ? "Checking..." : "Check service"}
        </button>
      </div>
    </section>
  );
}
