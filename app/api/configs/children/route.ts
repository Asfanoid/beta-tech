import { getChildConfigurations } from "@/domains/configurations/api";
import { apiErrorResponse, jsonResponse } from "@/lib/api/route-response";

export async function GET(request: Request): Promise<Response> {
  const parentUuid = new URL(request.url).searchParams.get("parentUuid");
  if (parentUuid === "") {
    return jsonResponse({ error: "parentUuid must not be empty." }, 400);
  }

  try {
    return jsonResponse(
      await getChildConfigurations(parentUuid ?? undefined),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
