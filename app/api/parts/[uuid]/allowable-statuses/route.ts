import { getAllowableStatuses } from "@/domains/parts/api";
import { apiErrorResponse, jsonResponse } from "@/lib/api/route-response";

type RouteContext = {
  params: Promise<{ uuid: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { uuid } = await params;

  try {
    return jsonResponse(await getAllowableStatuses(uuid));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
