import { requestJson } from "@/lib/api/client";
import type { components } from "@/lib/api/generated";

export type HealthCheck = components["schemas"]["HealthCheck"];

export function getHealthCheck(): Promise<HealthCheck> {
  return requestJson<HealthCheck>("health");
}
