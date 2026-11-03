import test from "node:test";
import assert from "node:assert/strict";
import { makeSeedancePayload, SEEDANCE_25 } from "../lib/seedance.ts";

test("2.5 text generation uses only the intended fields", () => {
  const request = makeSeedancePayload({ model: SEEDANCE_25, prompt: "A cat walking.", duration: 5,
    ratio: "16:9", resolution: "480p", serviceTier: "flex", generateAudio: true });
  assert.deepEqual(request, { model: SEEDANCE_25, content: [{ type: "text", text: "A cat walking." }],
    duration: 5, ratio: "16:9", resolution: "480p", service_tier: "flex", generate_audio: true });
});
test("first-frame input uses the correct role", () => {
  const request = makeSeedancePayload({ model: SEEDANCE_25, prompt: "Animate",
    imageUrl: "https://example.com/cover.png", ratio: "adaptive" });
  assert.deepEqual(request.content, [{ type: "text", text: "Animate" },
    { type: "image_url", image_url: { url: "https://example.com/cover.png" }, role: "first_frame" }]);
});
test("draft and finalization have separate payloads", () => {
  const draft = makeSeedancePayload({ model: SEEDANCE_25, prompt: "Test", draft: true, resolution: "480p" });
  assert.equal(draft.draft, true);
  const result = makeSeedancePayload({ model: SEEDANCE_25, finalizeDraftId: "job_ABC-123", serviceTier: "flex" });
  assert.deepEqual(result, { model: SEEDANCE_25,
    content: [{ type: "draft_task", draft_task: { id: "job_ABC-123" } }], resolution: "1080p", service_tier: "flex" });
});
test("invalid paid tasks are rejected before contacting API", () => {
  assert.throws(() => makeSeedancePayload({ model: SEEDANCE_25, prompt: "Hi", duration: 31 }));
  assert.throws(() => makeSeedancePayload({ model: SEEDANCE_25, prompt: "Hi", draft: true, resolution: "720p" }));
  assert.throws(() => makeSeedancePayload({ model: SEEDANCE_25, prompt: "Hi", imageUrl: "http://localhost/a.png" }));
  assert.throws(() => makeSeedancePayload({ model: SEEDANCE_25, finalizeDraftId: "../../secret" }));
  assert.throws(() => makeSeedancePayload({ model: "not-a-model", prompt: "Hi" }));
  assert.throws(() => makeSeedancePayload({ model: "dreamina-seedance-2-0-mini-260615", prompt: "Hi", resolution: "1080p" }));
});
