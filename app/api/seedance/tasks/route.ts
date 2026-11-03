import { NextResponse } from "next/server";
import { apiAccess, HttpError } from "../../../../lib/http.ts";
import { createSeedanceTask, SEEDANCE_MODELS } from "../../../../lib/seedance.ts";

export const runtime = "nodejs";

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Seedance could not complete the request." },
    { status: error instanceof HttpError ? error.status : 502, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const denied = apiAccess(request);
  if (denied) return denied;
  return NextResponse.json({
    configured: Boolean(process.env.BYTEPLUS_MODELARK_API_KEY?.trim()),
    models: SEEDANCE_MODELS,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = apiAccess(request);
  if (denied) return denied;
  try {
    if (Number(request.headers.get("Content-Length")) > 16_384) throw new HttpError(413, "Request is too large.");
    const raw = await request.text();
    if (raw.length > 16_384) throw new HttpError(413, "Request is too large.");
    let data: unknown;
    try { data = JSON.parse(raw); } catch { throw new HttpError(400, "Send a JSON task request."); }
    return NextResponse.json(await createSeedanceTask(data), { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
