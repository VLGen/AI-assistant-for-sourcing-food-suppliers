import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AnalysisSchema } from "@/lib/ai/schema";
import { buildAnalysisPrompt } from "@/lib/ai/prompt";
import { logAIRequest } from "@/lib/ai/logger";

const bodySchema = z.object({
  query: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(1).default("Подберите лучших поставщиков по качеству, цене и срокам поставки.")),
  supplierIds: z.array(z.string()).min(1).max(4),
});

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const OPENROUTER_FALLBACK_MODELS = [
  OPENROUTER_MODEL,
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.1-8b-instruct",
].filter((value, index, array) => value && array.indexOf(value) === index) as string[];
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;
export const runtime = 'nodejs';

async function streamOpenRouter({
  systemPrompt,
  userPrompt,
  model,
  retryHint,
}: {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  retryHint?: string;
}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY не задан. Добавьте его в .env");
  }

  let lastError: Error | null = null;

  for (const candidate of OPENROUTER_FALLBACK_MODELS) {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "Goulash Supplier Finder",
        },
        body: JSON.stringify({
          model: candidate,
          messages: [
            { role: "system", content: retryHint ? `${systemPrompt}\n\n${retryHint}` : systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          stream: true,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "analysis_response",
              schema: z.toJSONSchema(AnalysisSchema),
            },
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        const message = `OpenRouter request failed for ${candidate}: ${response.status} ${text}`;
        if (response.status === 429) {
          lastError = new Error(message);
          continue;
        }
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("Поток ответа от OpenRouter недоступен");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const deltaParts: string[] = [];
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data:")) continue;

          try {
            const payload = JSON.parse(trimmed.replace(/^data:\s*/, ""));
            const chunkText = payload.choices?.[0]?.delta?.content ?? "";
            if (!chunkText) continue;

            deltaParts.push(chunkText);
            fullText += chunkText;
          } catch {
            // ignore partial stream noise
          }
        }
      }

      return {
        deltaParts,
        fullText,
        model: candidate,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown OpenRouter error");
      if (candidate === OPENROUTER_FALLBACK_MODELS[OPENROUTER_FALLBACK_MODELS.length - 1]) {
        break;
      }
    }
  }

  throw lastError ?? new Error("OpenRouter request failed");
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = bodySchema.parse(await request.json());

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: body.supplierIds } },
      orderBy: { name: "asc" },
    });

    if (suppliers.length === 0) {
      logAIRequest({
        model: OPENROUTER_MODEL,
        promptLength: 0,
        responseLength: 0,
        durationMs: Date.now() - startedAt,
        success: false,
        error: "Поставщики не найдены",
      });
      return NextResponse.json({ error: "Поставщики не найдены" }, { status: 404 });
    }

    const normalizedSuppliers = suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      categories: supplier.categories ? JSON.parse(supplier.categories) : [],
      region: supplier.region,
      city: supplier.city,
      minOrder: supplier.minOrder,
      priceRange: supplier.priceRange,
      certificates: supplier.certificates ? JSON.parse(supplier.certificates) : [],
      deliveryTerms: supplier.deliveryTerms,
      workRegion: supplier.workRegion ? JSON.parse(supplier.workRegion) : [],
      verified: supplier.verified,
    }));

    const query = {
      q: body.query,
      categories: [],
      region: undefined,
      hasPrice: undefined,
      verifiedOnly: undefined,
    };

    const { systemPrompt, userPrompt } = buildAnalysisPrompt(query, normalizedSuppliers);
    const promptLength = `${systemPrompt}\n\n${userPrompt}`.length;

    const encoder = new TextEncoder();

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const initial = await streamOpenRouter({
            systemPrompt,
            userPrompt,
            model: OPENROUTER_MODEL,
          });

          const resolvedModel = initial.model ?? OPENROUTER_MODEL;

          for (const chunk of initial.deltaParts) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`),
            );
          }

          const fullText = initial.fullText.trim();
          if (!fullText) {
            throw new Error("Пустой ответ от OpenRouter");
          }

          const parsed = JSON.parse(fullText);
          const validated = AnalysisSchema.parse(parsed);

          logAIRequest({
            model: resolvedModel,
            promptLength,
            responseLength: fullText.length,
            durationMs: Date.now() - startedAt,
            success: true,
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", result: validated })}\n\n`),
          );
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Не удалось валидировать ответ LLM";
          const retryHint = `Предыдущий ответ не прошёл валидацию или запрос завершился с ошибкой: ${message}. Верни строго валидный JSON по схеме.`;

          try {
            const retry = await streamOpenRouter({
              systemPrompt,
              userPrompt,
              model: OPENROUTER_MODEL,
              retryHint,
            });

            const retryModel = retry.model ?? OPENROUTER_MODEL;

            for (const chunk of retry.deltaParts) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`),
              );
            }

            const retryFullText = retry.fullText.trim();
            const retryParsed = JSON.parse(retryFullText);
            const retryValidated = AnalysisSchema.parse(retryParsed);

            logAIRequest({
              model: retryModel,
              promptLength: promptLength + retryHint.length,
              responseLength: retryFullText.length,
              durationMs: Date.now() - startedAt,
              success: true,
            });

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done", result: retryValidated })}\n\n`),
            );
            controller.close();
          } catch (retryError) {
            const finalMessage = retryError instanceof Error ? retryError.message : "Не удалось валидировать ответ LLM";
            logAIRequest({
              model: OPENROUTER_MODEL,
              promptLength,
              responseLength: 0,
              durationMs: Date.now() - startedAt,
              success: false,
              error: finalMessage,
            });
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", message: finalMessage })}\n\n`),
            );
            controller.close();
          }
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Некорректный запрос";
    logAIRequest({
      model: OPENROUTER_MODEL,
      promptLength: 0,
      responseLength: 0,
      durationMs: Date.now() - startedAt,
      success: false,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
