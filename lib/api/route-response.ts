import {
  ApiConfigurationError,
  ApiNetworkError,
  ApiResponseError,
  ServiceApiError,
} from "@/lib/api/client";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ServiceApiError) {
    return jsonResponse(error.body, error.status);
  }

  if (error instanceof ApiConfigurationError) {
    return jsonResponse(
      { error: "Temporal Configuration Service is not configured." },
      503,
    );
  }

  if (error instanceof ApiNetworkError || error instanceof ApiResponseError) {
    return jsonResponse({ error: error.message }, 502);
  }

  throw error;
}
