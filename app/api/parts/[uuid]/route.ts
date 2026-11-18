import { getPart, updatePart } from "@/domains/parts/api";
import { parseUpdatePartInput } from "@/domains/parts/validation";
import {
  apiErrorResponse,
  jsonResponse,
} from "@/lib/api/route-response";

type RouteContext = {
  params: Promise<{ uuid: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { uuid } = await params;

  try {
    return jsonResponse(await getPart(uuid));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse({ error: "Expected an application/json body." }, 415);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }
    throw error;
  }

  const input = parseUpdatePartInput(body);
  if (!input) {
    return jsonResponse(
      { error: "Provide a valid unit and/or status update." },
      400,
    );
  }

  const { uuid } = await params;
  try {
    return jsonResponse(await updatePart(uuid, input));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
