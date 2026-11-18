import { requestJson } from "@/lib/api/client";
import type { Configuration } from "@/domains/configurations/types";

export function getChildConfigurations(
  parentUuid?: string,
): Promise<Configuration[]> {
  const query = new URLSearchParams();
  if (parentUuid !== undefined) {
    query.set("parentUuid", parentUuid);
  }

  const suffix = query.toString();
  return requestJson<Configuration[]>(
    `configs/children${suffix ? `?${suffix}` : ""}`,
  );
}
