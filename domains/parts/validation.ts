import type { PartStatus, UpdatePartInput } from "./types";

const PART_STATUSES = {
  configuration: true,
  active: true,
  draft: true,
  deprecated: true,
  obsolete: true,
  experimental: true,
  retired: true,
  recalled: true,
} satisfies Record<PartStatus, true>;

function isPartStatus(value: unknown): value is PartStatus {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PART_STATUSES, value)
  );
}

export function parseUpdatePartInput(value: unknown): UpdatePartInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length === 0 ||
    keys.some((key) => key !== "unit" && key !== "status")
  ) {
    return null;
  }

  const input: UpdatePartInput = {};

  if ("unit" in record) {
    if (typeof record.unit !== "string") {
      return null;
    }
    input.unit = record.unit;
  }

  if ("status" in record) {
    if (!isPartStatus(record.status)) {
      return null;
    }
    input.status = record.status;
  }

  return input;
}
