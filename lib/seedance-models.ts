// BytePlus ModelArk model IDs and duration/resolution constraints.
export const SEEDANCE_MODELS = [
  { id: "dreamina-seedance-2-0-mini-260615", label: "Seedance 2.0 Mini (drafts)", maxDuration: 15, resolutions: ["480p", "720p"] },
  { id: "dreamina-seedance-2-0-fast-260128", label: "Seedance 2.0 Fast", maxDuration: 15, resolutions: ["480p", "720p"] },
  { id: "dreamina-seedance-2-0-260128", label: "Seedance 2.0", maxDuration: 15, resolutions: ["480p", "720p", "1080p", "4k"] },
  { id: "dreamina-seedance-2-5-260628", label: "Seedance 2.5 (final)", maxDuration: 30, resolutions: ["480p", "720p", "1080p"] },
] as const;
export type SeedanceModelId = (typeof SEEDANCE_MODELS)[number]["id"];
export const SEEDANCE_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"] as const;
