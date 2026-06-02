// Server-side progress tracking for deal assembly

interface ProgressState {
  stage: string;
  detail: string;
  percent: number;
  startedAt: number;
}

let currentProgress: ProgressState = {
  stage: "idle",
  detail: "",
  percent: 0,
  startedAt: 0,
};

export function updateProgress(stage: string, detail: string, percent: number) {
  currentProgress = {
    stage,
    detail,
    percent,
    startedAt: currentProgress.startedAt || Date.now(),
  };
}

export function resetProgress() {
  currentProgress = { stage: "idle", detail: "", percent: 0, startedAt: 0 };
}

export function getProgress() {
  const elapsed = currentProgress.startedAt
    ? Math.round((Date.now() - currentProgress.startedAt) / 1000)
    : 0;
  return { ...currentProgress, elapsedSeconds: elapsed };
}
