import type { components } from "@/lib/api/generated";

export type BrowserApiErrorBody = {
  error?: components["schemas"]["InternalError"]["error"];
  allowableStatuses?: components["schemas"]["InvalidStatusChangeError"]["allowableStatuses"];
};

export class BrowserApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: BrowserApiErrorBody,
  ) {
    super(body.error ?? "API request failed.");
    this.name = "BrowserApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseErrorBody(payload: unknown, status: number): BrowserApiErrorBody {
  const error =
    isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : `API request failed with status ${status}.`;

  if (
    isRecord(payload) &&
    Array.isArray(payload.allowableStatuses) &&
    payload.allowableStatuses.every((value) => typeof value === "string")
  ) {
    return {
      error,
      allowableStatuses:
        payload.allowableStatuses as BrowserApiErrorBody["allowableStatuses"],
    };
  }

  return { error };
}

export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");

  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new BrowserApiError(0, {
      error: "Could not reach the application API. Check the connection and retry.",
    });
  }

  // A body that fails mid-read is a lost response: the request may have been applied.
  let responseText: string;
  try {
    responseText = await response.text();
  } catch {
    throw new BrowserApiError(0, {
      error: "The connection was interrupted before the application API finished responding.",
    });
  }

  let payload: unknown;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new BrowserApiError(response.status, {
          error: "The application API returned invalid JSON.",
        });
      }
    }
  }

  if (!response.ok) {
    throw new BrowserApiError(
      response.status,
      parseErrorBody(payload, response.status),
    );
  }

  if (payload === undefined) {
    throw new BrowserApiError(response.status, {
      error: "The application API returned an empty response.",
    });
  }

  return payload as T;
}
