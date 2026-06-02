// Next.js calls register() once when the server process starts. We use it to
// install process-level guards so a stray error in the long-running background
// sync can't crash the whole container (Node terminates on unhandled rejections
// by default). Errors are logged; the server keeps serving.
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  process.on("unhandledRejection", (reason) => {
    console.error("[duro-tracks] Unhandled promise rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[duro-tracks] Uncaught exception:", err);
  });
}
