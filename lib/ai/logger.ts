import fs from "node:fs";
import path from "node:path";

type LogInput = {
  model: string;
  promptLength: number;
  responseLength: number;
  durationMs: number;
  success: boolean;
  error?: string;
};

export function logAIRequest({
  model,
  promptLength,
  responseLength,
  durationMs,
  success,
  error,
}: LogInput) {
  const logDir = path.join(process.cwd(), "logs");
  const logFile = path.join(logDir, "ai.jsonl");

  const entry = {
    timestamp: new Date().toISOString(),
    model,
    promptLength,
    responseLength,
    durationMs,
    success,
    error: error ?? null,
  };

  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`, "utf8");
}
