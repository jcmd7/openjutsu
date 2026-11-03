import { NextResponse } from "next/server";
import { apiAccess, HttpError } from "../../../../../lib/http.ts";
import { retrieveSeedanceTask } from "../../../../../lib/seedance.ts";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = apiAccess(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await retrieveSeedanceTask(id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read Seedance task." },
      { status: error instanceof HttpError ? error.status : 502, headers: { "Cache-Control": "no-store" } });
  }
}
