"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { SEEDANCE_MODELS, SEEDANCE_RATIOS, type SeedanceModelId } from "../../lib/seedance-models.ts";
import "./seedance.css";

type Job = { id: string; status: string; videoUrl?: string | null; error?: string | null; draft?: boolean };
const STORAGE_KEY = "openjutsu.seedance.task";
const DONE = new Set(["succeeded", "failed", "cancelled", "expired"]);

export default function SeedancePage() {
  const [model, setModel] = useState<SeedanceModelId>(SEEDANCE_MODELS[0].id);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("480p");
  const [ratio, setRatio] = useState("16:9");
  const [imageUrl, setImageUrl] = useState("");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [draft, setDraft] = useState(false);
  const [confirmCharge, setConfirmCharge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const selected = SEEDANCE_MODELS.find((item) => item.id === model)!;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && /^[A-Za-z0-9_-]{1,128}$/.test(saved)) setTaskId(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!taskId || (job?.id === taskId && DONE.has(job.status))) return;
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/seedance/" + encodeURIComponent(taskId), { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to check video status.");
        if (active) { setJob(data as Job); setError(""); }
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "Could not check status.");
      }
    }
    void refresh();
    const interval = setInterval(() => void refresh(), 6000);
    return () => { active = false; clearInterval(interval); };
  }, [taskId, job?.id, job?.status]);

  function changeModel(id: SeedanceModelId) {
    const next = SEEDANCE_MODELS.find((item) => item.id === id)!;
    setModel(id);
    setDuration((current) => Math.min(current, next.maxDuration));
    if (!(next.resolutions as readonly string[]).includes(resolution)) setResolution("480p");
    if (id !== "dreamina-seedance-2-5-260628") setDraft(false);
    setConfirmCharge(false);
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmCharge || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/seedance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, duration, resolution, ratio, imageUrl, generateAudio, draft, confirmCharge }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start the generation.");
      setJob({ id: data.id, status: data.status || "queued" });
      setTaskId(data.id);
      try { localStorage.setItem(STORAGE_KEY, data.id); } catch {}
      setConfirmCharge(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Generation failed.");
    } finally { setBusy(false); }
  }

  return (
    <main className="shell seedance-page">
      <header className="top row">
        <div className="brand">
          <span className="mark" aria-hidden>忍</span>
          <div><h1>Openjutsu · Seedance</h1><p>Pay BytePlus directly. Your GPU is not used for cloud jobs.</p></div>
        </div>
        <Link href="/" className="secondary seedance-nav">Back to local editor</Link>
      </header>
      <div className="seedance-grid">
        <form className="panel seedance-form" onSubmit={(event) => void generate(event)}>
          <h2>Generate video</h2>
          <label>Model
            <select value={model} onChange={(event) => changeModel(event.target.value as SeedanceModelId)}>
              {SEEDANCE_MODELS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>Prompt
            <textarea required minLength={3} maxLength={4000} rows={6} value={prompt}
              onChange={(event) => setPrompt(event.target.value)} placeholder="Describe your shot, camera movement, subject, action and lighting." />
          </label>
          <div className="seedance-pair">
            <label>Output resolution
              <select value={resolution} onChange={(event) => { setResolution(event.target.value); if (event.target.value !== "480p") setDraft(false); setConfirmCharge(false); }}>
                {selected.resolutions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>Aspect ratio
              <select value={ratio} onChange={(event) => setRatio(event.target.value)}>
                {SEEDANCE_RATIOS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <label>Duration, seconds (4–{selected.maxDuration})
            <input type="number" required min={4} max={selected.maxDuration} step={1} value={duration}
              onChange={(event) => setDuration(Number(event.target.value))} />
          </label>
          <label>Public first-frame image URL (optional)
            <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://example.com/first-frame.jpg" />
          </label>
          <p className="hint">Use a publicly accessible HTTPS image. BytePlus restricts direct uploads of certain real-face reference assets.</p>
          <label className="seedance-check"><input type="checkbox" checked={generateAudio} onChange={(event) => setGenerateAudio(event.target.checked)} /> Generate audio</label>
          {model === "dreamina-seedance-2-5-260628" &&
            <label className="seedance-check"><input type="checkbox" checked={draft} onChange={(event) => {
              setDraft(event.target.checked); if (event.target.checked) setResolution("480p"); setConfirmCharge(false);
            }} /> Draft preview (480p; finalization not implemented yet)</label>}
          <div className="seedance-warning">
            <strong>Paid API generation</strong>
            <p>BytePlus bills by tokens, not a guaranteed flat rate per video. Confirm the amount using the <a href="https://docs.byteplus.com/en/docs/modelark/model-pricing" target="_blank" rel="noreferrer">official pricing calculator</a>. Openjutsu adds no markup or spending limit.</p>
          </div>
          <label className="seedance-check"><input type="checkbox" required checked={confirmCharge}
            onChange={(event) => setConfirmCharge(event.target.checked)} /> I approve the BytePlus charges for this generation.</label>
          <button className="primary" type="submit" disabled={!confirmCharge || busy}>{busy ? "Submitting…" : "Generate with BytePlus"}</button>
          {error && <p role="alert" className="error">{error}</p>}
        </form>
        <section className="panel seedance-result" aria-live="polite">
          <h2>Latest generation</h2>
          {!taskId && <p className="hint">Your task appears here after submitting.</p>}
          {taskId && <>
            <p className="hint">Task: <code>{taskId}</code></p>
            <p>Status: <strong>{job?.status || "Checking…"}</strong></p>
            {job?.error && <p className="error">{job.error}</p>}
            {job?.videoUrl && <>
              <video src={job.videoUrl} controls playsInline />
              <a className="secondary seedance-nav" href={job.videoUrl} target="_blank" rel="noreferrer">Open and save video</a>
              <p className="hint">BytePlus output URLs expire after 24 hours. Save a copy before that happens.</p>
            </>}
            {job?.draft && <p className="hint">This is a draft preview. A later version will allow finalizing from the draft task ID.</p>}
          </>}
          <p className="hint">The latest task ID is saved in this browser so you can recover it after refreshing.</p>
        </section>
      </div>
    </main>
  );
}
