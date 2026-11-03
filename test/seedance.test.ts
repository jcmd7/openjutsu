import test from "node:test";
import assert from "node:assert/strict";
import { parseSeedanceInput } from "../lib/byteplus.ts";

const request = {
  model: "dreamina-seedance-2-0-mini-260615",
  prompt: "A colorful product commercial with slow camera motion.",
  duration: 5,
  resolution: "480p",
  ratio: "16:9",
  confirmCharge: true,
};

test("accepts a basic text-to-video generation request", () => {
  const value = parseSeedanceInput(request);
  assert.equal(value.model, request.model);
  assert.equal(value.duration, 5);
  assert.equal(value.generateAudio, true);
});

test("rejects paid submissions without explicit confirmation", () => {
  assert.throws(() => parseSeedanceInput({ ...request, confirmCharge: false }), /Confirm paid generation/);
});

test("validates the model-specific 2.0 mini limits", () => {
  assert.throws(() => parseSeedanceInput({ ...request, duration: 20 }), /Unsupported duration/);
  assert.throws(() => parseSeedanceInput({ ...request, resolution: "1080p" }), /Unsupported resolution/);
});

test("supports 2.5 30-second 1080p final clips", () => {
  const result = parseSeedanceInput({
    ...request, model: "dreamina-seedance-2-5-260628", duration: 30, resolution: "1080p",
  });
  assert.equal(result.duration, 30);
});

test("drafts are available only for 2.5 at 480p", () => {
  assert.throws(() => parseSeedanceInput({ ...request, draft: true }), /Draft requires/);
  assert.throws(() => parseSeedanceInput({
    ...request, model: "dreamina-seedance-2-5-260628", resolution: "720p", draft: true,
  }), /Draft requires/);
  assert.equal(parseSeedanceInput({
    ...request, model: "dreamina-seedance-2-5-260628", draft: true,
  }).draft, true);
});

test("image inputs must be HTTPS without credentials", () => {
  assert.throws(() => parseSeedanceInput({ ...request, imageUrl: "http://example.com/image.png" }), /public HTTPS/);
  assert.throws(() => parseSeedanceInput({ ...request, imageUrl: "https://user:pass@example.com/image.png" }), /public HTTPS/);
  assert.equal(parseSeedanceInput({ ...request, imageUrl: "https://example.com/image.png" }).imageUrl,
    "https://example.com/image.png");
});

test("rejects unsupported models and ratios", () => {
  assert.throws(() => parseSeedanceInput({ ...request, model: "unknown" }), /Unknown model/);
  assert.throws(() => parseSeedanceInput({ ...request, ratio: "random" }), /Unsupported aspect ratio/);
});
