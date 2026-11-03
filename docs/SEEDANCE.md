# Direct Seedance generation via BytePlus

Openjutsu now offers a /seedance page for direct BytePlus ModelArk text-to-video and first-frame-to-video generation. It does not use ComfyUI or an API reseller for these cloud jobs.

## Setup

1. Activate the Dreamina Seedance models you want in your BytePlus ModelArk account. Activation and billing eligibility depend on your BytePlus account.
2. Create a ModelArk API key. Keep the key private.
3. Set BYTEPLUS_MODELARK_API_KEY in your local .env.local file; do not commit it.
4. Start Openjutsu and open http://127.0.0.1:3000/seedance.
5. Choose the model, duration, resolution and optional public HTTPS first-frame image, then explicitly approve the paid submission.
6. Watch status in Openjutsu and download completed videos within 24 hours. The latest task ID is saved to the current browser only.

Supported models: Dreamina Seedance 2.0 Mini, 2.0 Fast, 2.0 and 2.5.

## Costs and limits

BytePlus charges by generated tokens. The interface intentionally does not promise flat per-video rates, a preflight price, or a guaranteed budget cap. Confirm rates with the official ModelArk model pricing calculator and set billing alerts in BytePlus. No Openjutsu markup is added.

The integration currently supports text prompts and optional image-to-video with a publicly accessible first-frame URL. It does not yet provide private-file uploads, video or audio reference inputs, draft finalization, long-term result storage or an authoritative billing ledger. Some real-face reference assets are restricted by BytePlus.

Keep the BytePlus key on the server, never in NEXT_PUBLIC_ variables. Openjutsu's existing password and same-origin checks apply to the new paid API endpoints. Set OPENJUTSU_PASSWORD before exposing the application beyond localhost.

Official docs:
- https://docs.byteplus.com/en/docs/modelark/model-pricing
- https://docs.byteplus.com/en/docs/modelark/create-video-generation-task-api
- https://docs.byteplus.com/en/docs/modelark/get-video-generation-task-api
- https://docs.byteplus.com/en/docs/modelark/model-list
