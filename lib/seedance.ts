import { HttpError } from "./http.ts";

// ModelArk's international API; the key stays on the Next.js server.
const BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";
export const SEEDANCE_MODELS = {
  "dreamina-seedance-2-0-mini-260615": { label: "Seedance 2.0 Mini · budget", maxSeconds: 15, maxResolution: "720p" },
  "dreamina-seedance-2-0-fast-260128": { label: "Seedance 2.0 Fast", maxSeconds: 15, maxResolution: "720p" },
  "dreamina-seedance-2-0-260128": { label: "Seedance 2.0", maxSeconds: 15, maxResolution: "1080p" },
  "dreamina-seedance-2-5-260628": { label: "Seedance 2.5", maxSeconds: 30, maxResolution: "1080p" },
} as const;
export const SEEDANCE_25 = "dreamina-seedance-2-5-260628";
export const RESOLUTIONS = ["480p", "720p", "1080p"] as const;
export const RATIOS = ["adaptive", "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"] as const;

export type SeedanceModel = keyof typeof SEEDANCE_MODELS;
export type SeedanceRequest = {
  model: SeedanceModel;
  prompt?: string;
  imageUrl?: string;
  resolution?: (typeof RESOLUTIONS)[number];
  ratio?: (typeof RATIOS)[number];
  duration?: number;
  generateAudio?: boolean;
  draft?: boolean;
  serviceTier?: "default" | "flex";
  finalizeDraftId?: string;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Invalid request.");
  return value as Record<string, unknown>;
}
function choice<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) throw new HttpError(400, "Choose a supported " + label + ".");
  return value as T;
}
export function validateTaskId(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new HttpError(400, "Invalid Seedance task ID.");
}
export function makeSeedancePayload(value: unknown): Record<string, unknown> {
  const input = object(value);
  const model = choice(input.model, Object.keys(SEEDANCE_MODELS) as SeedanceModel[], "model");
  const config = SEEDANCE_MODELS[model];
  const service_tier = choice(input.serviceTier ?? "default", ["default", "flex"], "service tier");
  const finalizeDraftId = typeof input.finalizeDraftId === "string" ? input.finalizeDraftId.trim() : "";
  if (finalizeDraftId) {
    if (model !== SEEDANCE_25) throw new HttpError(400, "Only Seedance 2.5 drafts can be finalized here.");
    validateTaskId(finalizeDraftId);
    return { model, content: [{ type: "draft_task", draft_task: { id: finalizeDraftId } }], resolution: "1080p", service_tier };
  }

  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt || prompt.length > 5000) throw new HttpError(400, "Enter a prompt (maximum 5,000 characters).");
  const duration = input.duration ?? 5;
  if (typeof duration !== "number" || !Number.isInteger(duration) || duration < 4 || duration > config.maxSeconds) {
    throw new HttpError(400, "Choose a whole duration from 4 to " + config.maxSeconds + " seconds.");
  }
  const draft = input.draft === true;
  if (input.draft !== undefined && typeof input.draft !== "boolean") throw new HttpError(400, "Invalid draft setting.");
  if (draft && model !== SEEDANCE_25) throw new HttpError(400, "Draft mode is supported for Seedance 2.5 only.");
  const resolution = choice(input.resolution ?? "480p", RESOLUTIONS, "resolution");
  if (resolution === "1080p" && config.maxResolution !== "1080p") throw new HttpError(400, "This model supports 480p or 720p.");
  if (draft && resolution !== "480p") throw new HttpError(400, "Seedance 2.5 drafts must be 480p.");
  const ratio = choice(input.ratio ?? "adaptive", RATIOS, "aspect ratio");
  if (input.generateAudio !== undefined && typeof input.generateAudio !== "boolean") throw new HttpError(400, "Invalid audio setting.");
  const content: Record<string, unknown>[] = [{ type: "text", text: prompt }];
  if (input.imageUrl !== undefined && input.imageUrl !== "") {
    if (typeof input.imageUrl !== "string" || input.imageUrl.length > 2048) throw new HttpError(400, "Invalid image URL.");
    let image: URL;
    try { image = new URL(input.imageUrl); } catch { throw new HttpError(400, "Provide a public HTTPS image URL."); }
    if (image.protocol !== "https:" || !image.hostname || image.username || image.password) {
      throw new HttpError(400, "Provide a public HTTPS image URL.");
    }
    if (model === SEEDANCE_25 && ratio !== "adaptive") throw new HttpError(400, "Seedance 2.5 first-frame generation requires adaptive aspect ratio.");
    content.push({ type: "image_url", image_url: { url: image.href }, role: "first_frame" });
  }
  return {
    model, content, resolution, ratio, duration,
    generate_audio: input.generateAudio !== false,
    service_tier, ...(draft ? { draft: true } : {}),
  };
}

function apiKey() {
  const key = process.env.BYTEPLUS_MODELARK_API_KEY?.trim();
  if (!key) throw new HttpError(503, "BytePlus is not configured. Set BYTEPLUS_MODELARK_API_KEY on the OpenJutsu server.");
  return key;
}

async function callBytePlus(path: string, options: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: { "Authorization": "Bearer " + apiKey(), "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const raw: unknown = await response.json().catch(() => null);
  const data = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  if (!response.ok) {
    const detail = data.error && typeof data.error === "object" ? (data.error as Record<string, unknown>).message : data.message;
    const message = typeof detail === "string" ? detail.slice(0, 400) : "BytePlus API error (" + response.status + ").";
    // Never return the Authorization header or server environment variables.
    throw new HttpError(response.status === 429 ? 429 : 502, message);
  }
  return data;
}

export async function createSeedanceTask(value: unknown) {
  const payload = makeSeedancePayload(value);
  const result = await callBytePlus("", { method: "POST", body: JSON.stringify(payload) });
  if (typeof result.id !== "string") throw new HttpError(502, "BytePlus did not return a task ID.");
  return { id: result.id, status: result.status ?? "queued" };
}

export async function retrieveSeedanceTask(id: string) {
  validateTaskId(id);
  const result = await callBytePlus("/" + encodeURIComponent(id), { method: "GET" });
  const content = result.content && typeof result.content === "object" ? result.content as Record<string, unknown> : {};
  const error = result.error && typeof result.error === "object" ? result.error as Record<string, unknown> : {};
  return {
    id, status: typeof result.status === "string" ? result.status : "unknown",
    model: typeof result.model === "string" ? result.model : null,
    draft: result.draft === true,
    videoUrl: typeof content.video_url === "string" ? content.video_url : null,
    lastFrameUrl: typeof content.last_frame_url === "string" ? content.last_frame_url : null,
    error: typeof error.message === "string" ? error.message.slice(0, 400) : null,
  };
}
