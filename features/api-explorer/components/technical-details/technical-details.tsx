import type { Configuration } from "@/domains/configurations/types";
import type { Part } from "@/domains/parts/types";
import styles from "./technical-details.module.css";

type TechnicalDetailsProps = {
  part: Part;
  configuration: Configuration | null;
};

export function TechnicalDetails({
  part,
  configuration,
}: TechnicalDetailsProps) {
  return (
    <details className={styles["technical-details"]}>
      <summary>Technical details</summary>
      <dl>
        <div>
          <dt>Part ID</dt>
          <dd>
            <code>{part.uuid}</code>
          </dd>
        </div>
        {configuration && (
          <div>
            <dt>Configuration ID</dt>
            <dd>
              <code>{configuration.uuid}</code>
            </dd>
          </div>
        )}
      </dl>
    </details>
  );
}
