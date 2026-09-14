type LogPayload = {
  model: string;
  promptLength: number;
  responseLength: number;
  durationMs: number;
  success: boolean;
  error?: string;
};

export function logAIRequest(payload: LogPayload) {
  const entry = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  // Всегда пишем в console — это работает и локально, и на Vercel
  if (payload.success) {
    console.log("[ai]", JSON.stringify(entry));
  } else {
    console.error("[ai]", JSON.stringify(entry));
  }

  // Пишем в файл только локально и только если это возможно
  if (process.env.NODE_ENV !== "production") {
    try {
      const fs = require("node:fs");
      const path = require("node:path");
      const dir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(path.join(dir, "ai.jsonl"), JSON.stringify(entry) + "\n");
    } catch {
      // молча игнорируем — лог в файл не критичен
    }
  }
}