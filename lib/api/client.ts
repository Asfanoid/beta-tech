import "server-only";

export type ServiceErrorBody = {
  error: string;
  allowableStatuses?: string[];
};

export class ServiceApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ServiceErrorBody,
  ) {
    super(body.error);
    this.name = "ServiceApiError";
  }
}

export class ApiConfigurationError extends Error {
  constructor() {
    super("Temporal Configuration Service server configuration is missing or invalid.");
    this.name = "ApiConfigurationError";
  }
}

export class ApiNetworkError extends Error {
  constructor() {
    super("Temporal Configuration Service could not be reached.");
    this.name = "ApiNetworkError";
  }
}

export class ApiResponseError extends Error {
  constructor() {
    super("Temporal Configuration Service returned an invalid response.");
    this.name = "ApiResponseError";
  }
}

function getServiceConfiguration() {
  const apiUrl = process.env.API_URL;
  const apiKey = process.env.API_KEY;

  if (!apiUrl || !apiKey) {
    throw new ApiConfigurationError();
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(apiUrl);
  } catch {
    throw new ApiConfigurationError();
  }

  if (
    !["https:", "http:"].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password
  ) {
    throw new ApiConfigurationError();
  }

  const apiPath = baseUrl.pathname.replace(/\/+$/, "");
  if (!apiPath.endsWith("/api")) {
    throw new ApiConfigurationError();
  }

  baseUrl.pathname = `${apiPath}/`;
  baseUrl.search = "";
  baseUrl.hash = "";

  return { baseUrl, apiKey };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getServiceErrorBody(
  payload: unknown,
  fallbackMessage: string,
): ServiceErrorBody {
  if (!isRecord(payload)) {
    return { error: fallbackMessage || "Service request failed." };
  }

  const error =
    typeof payload.error === "string"
      ? payload.error
      : fallbackMessage || "Service request failed.";
  const allowableStatuses = payload.allowableStatuses;

  if (
    Array.isArray(allowableStatuses) &&
    allowableStatuses.every((status) => typeof status === "string")
  ) {
    return { error, allowableStatuses };
  }

  return { error };
}

export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { baseUrl, apiKey } = getServiceConfiguration();
  const relativePath = path.replace(/^\/+/, "");
  const url = new URL(relativePath, baseUrl);
  if (
    url.origin !== baseUrl.origin ||
    !url.pathname.startsWith(baseUrl.pathname)
  ) {
    throw new TypeError("Upstream path must remain within the configured API root.");
  }

  const headers = new Headers(init.headers);

  headers.set("accept", "application/json");
  headers.set("x-api-key", apiKey);

  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    throw new ApiNetworkError();
  }

  let responseText: string;
  try {
    responseText = await response.text();
  } catch {
    throw new ApiNetworkError();
  }

  let payload: unknown;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new ApiResponseError();
      }
    }
  }

  if (!response.ok) {
    throw new ServiceApiError(
      response.status,
      getServiceErrorBody(payload, response.statusText),
    );
  }

  if (payload === undefined) {
    throw new ApiResponseError();
  }

  return payload as T;
}
