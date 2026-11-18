import { BrowserApiError } from "@/lib/api/browser-client";
import type { components } from "@/lib/api/generated";

const API_ERROR_MESSAGES = {
  partNotFound: "Part not found",
  configurationNotFound: "Configuration not found",
  invalidStatusChange: "Invalid status change",
} satisfies {
  partNotFound: components["schemas"]["PartNotFoundError"]["error"];
  configurationNotFound: components["schemas"]["ConfigurationNotFoundError"]["error"];
  invalidStatusChange: components["schemas"]["InvalidStatusChangeError"]["error"];
};

export type ApiRequestContext =
  | "machine-list"
  | "assembly"
  | "part"
  | "status-choices"
  | "part-update";

const FALLBACK_MESSAGES: Record<ApiRequestContext, string> = {
  "machine-list": "Could not load machines.",
  assembly: "Could not load this part of the assembly.",
  part: "Could not load part details.",
  "status-choices": "Could not load available status changes.",
  "part-update": "The part update could not be completed.",
};

export function getUserFacingApiError(
  error: unknown,
  context: ApiRequestContext,
): string {
  if (!(error instanceof BrowserApiError)) {
    return FALLBACK_MESSAGES[context];
  }

  if (error.status === 0) {
    return "The service could not be reached. Check your connection and retry.";
  }

  if (error.status === 401 || error.status === 403) {
    return "Access to the service was denied. Contact your administrator.";
  }

  if (error.status === 404) {
    if (
      (context === "part" || context === "status-choices") &&
      error.body.error === API_ERROR_MESSAGES.partNotFound
    ) {
      return error.body.error;
    }
    if (
      context === "assembly" &&
      error.body.error === API_ERROR_MESSAGES.configurationNotFound
    ) {
      return error.body.error;
    }
  }

  if (error.status === 400 && context === "part-update") {
    if (error.body.error === API_ERROR_MESSAGES.invalidStatusChange) {
      return `${error.body.error}. Refresh the available status choices before trying again.`;
    }
    return "The requested update was rejected. Review the current part details before trying again.";
  }

  if (error.status >= 500) {
    return "The service is temporarily unavailable. Try again.";
  }

  return FALLBACK_MESSAGES[context];
}
