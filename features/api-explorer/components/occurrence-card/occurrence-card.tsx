import type { Configuration } from "@/domains/configurations/types";
import panelStyles from "../panel.module.css";
import styles from "./occurrence-card.module.css";

const classNames = { ...panelStyles, ...styles };

type OccurrenceCardProps = {
  machine: Configuration;
  configuration: Configuration;
  path: string[];
};

export function OccurrenceCard({
  machine,
  configuration,
  path,
}: OccurrenceCardProps) {
  return (
    <section className={classNames["occurrence-card"]}>
      <p className={classNames["panel-kicker"]}>ASSEMBLY OCCURRENCE</p>
      <strong>
        {machine.endUnitSerialNo
          ? `Time Machine · Serial ${machine.endUnitSerialNo}`
          : "Selected machine"}
      </strong>
      <p className={classNames["occurrence-path"]} aria-label="Assembly path">
        {path.join(" / ")}
      </p>
      <p className={classNames["occurrence-quantity"]}>
        Quantity in this assembly <strong>{configuration.quantity}</strong>
      </p>
    </section>
  );
}
