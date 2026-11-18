import { getHealthCheck } from "@/lib/api/health";
import { apiErrorResponse, jsonResponse } from "@/lib/api/route-response";

export async function GET(): Promise<Response> {
  try {
    return jsonResponse(await getHealthCheck());
  } catch (error) {
    return apiErrorResponse(error);
  }
}
