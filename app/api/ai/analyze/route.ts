import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AnalysisSchema } from "@/lib/ai/schema";
import { buildAnalysisPrompt } from "@/lib/ai/prompt";
import { logAIRequest } from "@/lib/ai/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const bodySchema = z.object({
  query: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1).default("Подберите лучших поставщиков по качеству, цене и срокам поставки."),
  ),
  supplierIds: z.array(z.string()).min(1).max(4),
});

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL ?? "qwen/qwen3-14b";
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://api.vsegpt.ru/v1";

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!API_KEY) throw new Error("OPENROUTER_API_KEY не задан");

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: { name: "analysis_response", schema: z.toJSONSchema(AnalysisSchema) },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ от LLM");
  return content;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const body = bodySchema.parse(await request.json());

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: body.supplierIds } },
      orderBy: { name: "asc" },
    });
    if (!suppliers.length) {
      return NextResponse.json({ error: "Поставщики не найдены" }, { status: 404 });
    }

    const normalized = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      categories: s.categories ? JSON.parse(s.categories) : [],
      region: s.region,
      city: s.city,
      minOrder: s.minOrder,
      priceRange: s.priceRange,
      certificates: s.certificates ? JSON.parse(s.certificates) : [],
      deliveryTerms: s.deliveryTerms,
      workRegion: s.workRegion ? JSON.parse(s.workRegion) : [],
      verified: s.verified,
    }));

    const query = {
      q: body.query,
      categories: [],
      region: undefined,
      hasPrice: undefined,
      verifiedOnly: undefined,
    };
    const { systemPrompt, userPrompt } = buildAnalysisPrompt(query, normalized);
    const promptLength = `${systemPrompt}\n\n${userPrompt}`.length;

    let raw = await callLLM(systemPrompt, userPrompt);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const hint = "Предыдущий ответ не был валидным JSON. Верни строго валидный JSON по схеме.";
      raw = await callLLM(`${systemPrompt}\n\n${hint}`, userPrompt);
      parsed = JSON.parse(raw);
    }

    const validated = AnalysisSchema.parse(parsed);

    logAIRequest({
      model: MODEL,
      promptLength,
      responseLength: raw.length,
      durationMs: Date.now() - startedAt,
      success: true,
    });

    return NextResponse.json(validated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка AI-анализа";
    logAIRequest({
      model: MODEL,
      promptLength: 0,
      responseLength: 0,
      durationMs: Date.now() - startedAt,
      success: false,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}