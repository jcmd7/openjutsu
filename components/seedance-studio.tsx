"use client";

import { useEffect, useState, type FormEvent } from "react";

type Job = {
  id: string; status: string; model?: string | null; draft?: boolean;
  videoUrl?: string | null; lastFrameUrl?: string | null; error?: string | null;
};
const MODELS = [
  { id: "dreamina-seedance-2-0-mini-260615", label: "2.0 Mini — economical", max: 15, hiRes: false },
  { id: "dreamina-seedance-2-0-fast-260128", label: "2.0 Fast", max: 15, hiRes: false },
  { id: "dreamina-seedance-2-0-260128", label: "2.0", max: 15, hiRes: true },
  { id: "dreamina-seedance-2-5-260628", label: "2.5 — highest quality", max: 30, hiRes: true },
];
const TASK_KEY = "openjutsu.seedance.task";
const TERMINAL = new Set(["succeeded", "failed", "cancelled", "canceled", "expired"]);
const fullModel = MODELS[3].id;

export function SeedanceStudio() {
  const [model, setModel] = useState(fullModel);
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [resolution, setResolution] = useState("480p");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState(5);
  const [audio, setAudio] = useState(true);
  const [draft, setDraft] = useState(false);
  const [tier, setTier] = useState<"flex" | "default">("flex");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const config = MODELS.find((m) => m.id === model) ?? MODELS[3];

  useEffect(() => {
    fetch("/api/seedance/tasks", { cache: "no-store" }).then(async (res) => {
      const data = await res.json();
      if (res.ok) setConfigured(Boolean(data.configured));
    }).catch(() => {});
    const savedId = localStorage.getItem(TASK_KEY);
    if (savedId && /^[a-zA-Z0-9_-]{1,128}$/.test(savedId)) setJob({ id: savedId, status: "loading" });
  }, []);

  useEffect(() => {
    if (!job?.id || TERMINAL.has(job.status)) return;
    let live = true;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch("/api/seedance/tasks/" + encodeURIComponent(job.id), { cache: "no-store" });
        const data = await response.json();
        if (live) {
          if (!response.ok) {
            setError(data.error ?? "Unable to check task status.");
          } else {
            setJob(data as Job);
            setError("");
          }
        }
      } catch {
        if (live) setError("Connection error. Task can still be checked by its ID.");
      } finally { busy = false; }
    };
    void check();
    const timer = setInterval(() => { void check(); }, 5000);
    return () => { live = false; clearInterval(timer); };
  }, [job?.id, job?.status]);

  const submit = async (body: Record<string, unknown>) => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/seedance/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Seedance task submission failed.");
      localStorage.setItem(TASK_KEY, data.id);
      setJob({ id: data.id, status: data.status ?? "queued" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit task.");
    } finally { setPending(false); }
  };

  const generate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit({
      model, prompt, imageUrl, resolution: draft ? "480p" : resolution,
      ratio: imageUrl ? "adaptive" : ratio, duration, generateAudio: audio,
      draft, serviceTier: tier,
    });
  };

  const finalize = () => {
    if (job?.id && job.status === "succeeded" && job.draft) {
      void submit({ model: fullModel, finalizeDraftId: job.id, serviceTier: tier });
    }
  };

  return (
    <main className="seedance-shell">
      <header className="seedance-header">
        <a href="/" className="seedance-back">← OpenJutsu / motion swaps</a>
        <div className="seedance-title">
          <div className="seedance-symbol">O</div>
          <div><h1>Seedance Studio</h1><p>Direct BytePlus ModelArk generation · your key, your bill</p></div>
        </div>
      </header>
      <div className="seedance-layout">
        <form className="seedance-panel" onSubmit={generate}>
          <div className="seedance-section-title"><h2>New generation</h2><span className="seedance-tag">Cloud API</span></div>
          <label>Model
            <select value={model} onChange={(e) => {
              const next = e.target.value;
              const max = MODELS.find((m) => m.id === next) ?? MODELS[3];
              setModel(next); setDuration((v) => Math.min(v, max.max));
              if (!max.hiRes) setResolution((v) => v === "1080p" ? "720p" : v);
              setDraft(false);
            }}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label>Describe the shot
            <textarea required maxLength={5000} rows={5} placeholder="A close-up of a paper airplane gliding past a rain-soaked city window, cinematic lighting..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </label>
          <label>First-frame image URL <small>(optional, public HTTPS)</small>
            <input type="url" placeholder="https://example.com/reference.png" value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); if (e.target.value) setRatio("adaptive"); }} />
          </label>
          <p className="seedance-note">BytePlus restricts direct reference uploads containing real human faces for Seedance 2.x. Use authorized assets and review its portrait policy.</p>
          <div className="seedance-fields">
            <label>Resolution
              <select value={draft ? "480p" : resolution} disabled={draft} onChange={(e) => setResolution(e.target.value)}>
                <option value="480p">480p · cheaper</option>
                <option value="720p">720p</option>
                {config.hiRes && <option value="1080p">1080p</option>}
              </select>
            </label>
            <label>Duration (seconds)
              <input type="number" min={4} max={config.max} step={1} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))} required />
            </label>
            <label>Aspect ratio
              <select value={imageUrl ? "adaptive" : ratio} disabled={Boolean(imageUrl)} onChange={(e) => setRatio(e.target.value)}>
                {["adaptive", "16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label>Service tier
              <select value={tier} onChange={(e) => setTier(e.target.value as "default" | "flex")}>
                <option value="flex">Flex · 50% lower token rate, slower</option>
                <option value="default">Online · normal speed</option>
              </select>
            </label>
          </div>
          <label className="seedance-check"><input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)}/> Generate synced audio</label>
          {model === fullModel && <label className="seedance-check"><input type="checkbox" checked={draft}
            onChange={(e) => { setDraft(e.target.checked); if (e.target.checked) setResolution("480p"); }}/> 480p draft (can finalize to 1080p later)</label>}
          <p className="seedance-note">Every submission is billable. Draft and final are billed separately. Flex jobs may take much longer. Exact costs depend on ModelArk token usage and selected inputs; verify rates in your BytePlus account.</p>
          <button type="submit" className="seedance-primary" disabled={pending || !prompt.trim() || configured === false}>
            {pending ? "Submitting…" : draft ? "Generate paid draft" : "Generate paid video"}
          </button>
          {configured === false && <p className="seedance-error">Set BYTEPLUS_MODELARK_API_KEY in the OpenJutsu server environment to enable generation.</p>}
          {configured === true && <p className="seedance-ok">BytePlus API key configured on server.</p>}
          {error && <p className="seedance-error" role="alert">{error}</p>}
        </form>
        <section className="seedance-panel seedance-output" aria-label="Seedance task status">
          <h2>Latest job</h2>
          {!job ? <div className="seedance-empty">Your generated video will appear here. No payment or model call occurs until you submit.</div> : (
            <>
              <div className="seedance-job">
                <strong>{job.status}</strong>
                <small>Task ID: {job.id}</small>
              </div>
              {job.videoUrl && <video key={job.videoUrl} controls playsInline src={job.videoUrl} />}
              {job.error && <p className="seedance-error">{job.error}</p>}
              {job.status === "succeeded" && job.videoUrl && <a className="seedance-download" href={job.videoUrl} target="_blank" rel="noreferrer">Open/download generated video ↗</a>}
              {job.status === "succeeded" && job.draft && <button className="seedance-primary"
                type="button" disabled={pending} onClick={finalize}>Finalize draft to 1080p (new paid job)</button>}
              <p className="seedance-note">BytePlus output links expire after 24 hours. Save completed videos promptly. The most recent task ID is stored in this browser.</p>
            </>
          )}
          <div className="seedance-help">
            <h3>Direct billing setup</h3>
            <p>Activate your Seedance model at BytePlus ModelArk, create an API key, and set <code>BYTEPLUS_MODELARK_API_KEY</code> in your server-only <code>.env.local</code>. Restart OpenJutsu.</p>
            <a href="https://ai.byteplus.com/en" target="_blank" rel="noreferrer">Open BytePlus ModelArk ↗</a>
            <a href="https://docs.byteplus.com/en/docs/ModelArk/create-video-generation-task-api" target="_blank" rel="noreferrer">Official API documentation ↗</a>
          </div>
        </section>
      </div>
    </main>
  );
}
