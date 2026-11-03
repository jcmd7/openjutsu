import { apiAccess, HttpError } from "../../../../lib/http.ts";
import { getSeedance } from "../../../../lib/byteplus.ts";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = apiAccess(request);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    return Response.json(await getSeedance(id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Status unavailable." },
      { status: error instanceof HttpError ? error.status : 502, headers: { "Cache-Control": "no-store" } });
  }
}
