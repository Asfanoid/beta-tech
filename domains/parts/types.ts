import type { components } from "../../lib/api/generated";

export type Part = components["schemas"]["Part"];
export type PartStatus = Part["status"];
export type AllowableStatuses = components["schemas"]["AllowableStatuses"];
export type UpdatePartInput = components["schemas"]["UpdatePartBody"];
