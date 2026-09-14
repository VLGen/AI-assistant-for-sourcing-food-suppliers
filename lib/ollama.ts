import { Ollama } from "ollama";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "Qwen 3 14B";

export const ollama = new Ollama({ host: OLLAMA_URL });

export function getOllamaModel() {
  return OLLAMA_MODEL;
}
