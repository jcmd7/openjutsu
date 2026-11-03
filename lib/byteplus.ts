import { HttpError } from "./http.ts";
import { SEEDANCE_MODELS, SEEDANCE_RATIOS } from "./seedance-models.ts";

const BASE = "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";
type Obj = Record<string, unknown>;
const object = (x: unknown): x is Obj => x !== null && typeof x === "object" && !Array.isArray(x);

export function parseSeedanceInput(input: unknown) {
  if (!object(input)) throw new HttpError(400, "Invalid request.");
  const model = SEEDANCE_MODELS.find((m) => m.id === input.model);
  if (!model) throw new HttpError(400, "Unknown model.");
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (prompt.length < 3 || prompt.length > 4000) throw new HttpError(400, "Prompt must be 3 to 4,000 characters.");
  const duration = input.duration;
  if (typeof duration !== "number" || !Number.isInteger(duration) || duration < 4 || duration > model.maxDuration)
    throw new HttpError(400, "Unsupported duration.");
  const resolution = input.resolution;
  if (typeof resolution !== "string" || !(model.resolutions as readonly string[]).includes(resolution))
    throw new HttpError(400, "Unsupported resolution.");
  const ratio = input.ratio;
  if (typeof ratio !== "string" || !(SEEDANCE_RATIOS as readonly string[]).includes(ratio))
    throw new HttpError(400, "Unsupported aspect ratio.");
  const imageUrl = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  if (imageUrl) {
    let url: URL;
    try { url = new URL(imageUrl); } catch { throw new HttpError(400, "Image must be a public HTTPS URL."); }
    if (url.protocol !== "https:" || url.username || url.password || imageUrl.length > 4096)
      throw new HttpError(400, "Image must be a public HTTPS URL.");
  }
  const draft = input.draft === true;
  if (draft && (model.id !== "dreamina-seedance-2-5-260628" || resolution !== "480p"))
    throw new HttpError(400, "Draft requires Seedance 2.5 at 480p.");
  if (input.confirmCharge !== true) throw new HttpError(400, "Confirm paid generation.");
  return { model: model.id, prompt, duration, resolution, ratio, imageUrl, draft, generateAudio: input.generateAudio !== false };
}

async function ark(path: string, options: RequestInit = {}): Promise<Obj> {
  const key = process.env.BYTEPLUS_MODELARK_API_KEY?.trim();
  if (!key) throw new HttpError(503, "Set BYTEPLUS_MODELARK_API_KEY in the server environment first.");
  let response: Response;
  try {
    response = await fetch(BASE + path, {
      ...options, cache: "no-store", signal: AbortSignal.timeout(30_000),
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new HttpError(502, "BytePlus ModelArk is unreachable.");
  }
  const value: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const source = object(value) ? value : {};
    const err = object(source.error) ? source.error : {};
    const message = typeof err.message === "string" ? err.message : "BytePlus request failed.";
    throw new HttpError(response.status >= 500 ? 502 : response.status, message.slice(0, 500));
  }
  if (!object(value)) throw new HttpError(502, "Invalid BytePlus response.");
  return value;
}

export async function createSeedance(input: unknown) {
  const data = parseSeedanceInput(input);
  const content: Obj[] = [{ type: "text", text: data.prompt }];
  if (data.imageUrl) content.push({ type: "image_url", image_url: { url: data.imageUrl }, role: "first_frame" });
  const body = {
    model: data.model, content, duration: data.duration, resolution: data.resolution,
    ratio: data.ratio, generate_audio: data.generateAudio, ...(data.draft ? { draft: true } : {}),
  };
  const result = await ark("", { method: "POST", body: JSON.stringify(body) });
  if (typeof result.id !== "string") throw new HttpError(502, "No task ID was returned.");
  return { id: result.id, status: typeof result.status === "string" ? result.status : "queued" };
}

export async function getSeedance(id: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new HttpError(400, "Invalid task ID.");
  const task = await ark("/" + encodeURIComponent(id));
  const content = object(task.content) ? task.content : {};
  const error = object(task.error) ? task.error : {};
  return {
    id, status: typeof task.status === "string" ? task.status : "unknown",
    model: typeof task.model === "string" ? task.model : "",
    draft: task.draft === true,
    videoUrl: typeof content.video_url === "string" && content.video_url.startsWith("https://") ? content.video_url : null,
    error: typeof error.message === "string" ? error.message : null,
  };
}
