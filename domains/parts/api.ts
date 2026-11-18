import { requestJson } from "@/lib/api/client";
import type {
  AllowableStatuses,
  Part,
  UpdatePartInput,
} from "@/domains/parts/types";

export function getPart(uuid: string): Promise<Part> {
  return requestJson<Part>(`parts/${encodeURIComponent(uuid)}`);
}

export function getAllowableStatuses(
  uuid: string,
): Promise<AllowableStatuses> {
  return requestJson<AllowableStatuses>(
    `parts/${encodeURIComponent(uuid)}/allowable-statuses`,
  );
}

export function updatePart(
  uuid: string,
  input: UpdatePartInput,
): Promise<Part> {
  return requestJson<Part>(`parts/${encodeURIComponent(uuid)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
