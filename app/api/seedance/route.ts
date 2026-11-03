import { apiAccess, HttpError } from "../../../lib/http.ts";
import { createSeedance } from "../../../lib/byteplus.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = apiAccess(request);
  if (denied) return denied;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 16_384)
      throw new HttpError(413, "Request is too large.");
    const input: unknown = await request.json();
    return Response.json(await createSeedance(input), { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request." },
      { status: error instanceof HttpError ? error.status : 400, headers: { "Cache-Control": "no-store" } });
  }
}
