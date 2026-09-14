"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type AnalysisResult = {
  summary: string;
  perSupplier: Array<{
    id: string;
    pros: string[];
    cons: string[];
    fitScore: number;
  }>;
  recommendedId: string;
  reasoning: string;
  risks: string[];
  draftMessage: string;
};

type Props = {
  supplierIds: string[];
  query?: string;
};

type SupplierMeta = {
  id: string;
  name: string;
};

const formatTime = (ms?: number | null) => {
  if (ms == null || !Number.isFinite(ms)) return "—";
  return `${ms} ms`;
};

const getSupplierName = (supplierId: string, suppliers: SupplierMeta[]) => {
  return suppliers.find((supplier) => supplier.id === supplierId)?.name ?? supplierId;
};

export function AIAnalysisPanel({ supplierIds, query }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [model, setModel] = useState<string>("Qwen 3 14B");
  const [suppliers, setSuppliers] = useState<SupplierMeta[]>([]);
  const [draftQuery, setDraftQuery] = useState(query ?? "");
  const streamTextRef = useRef("");

  useEffect(() => {
    if (!supplierIds.length) return;

    const loadSuppliers = async () => {
      try {
        const response = await fetch(`/api/suppliers/by-ids?ids=${encodeURIComponent(supplierIds.join(","))}`);
        if (!response.ok) return;
        const payload = (await response.json()) as { items?: Array<{ id: string; name: string }> };
        setSuppliers(payload.items ?? []);
      } catch {
        // ignore supplier meta errors here; fallback to ids if needed
      }
    };

    void loadSuppliers();
  }, [supplierIds]);

  useEffect(() => {
    setDraftQuery(query ?? "");
  }, [query]);

  useEffect(() => {
    if (isLoading) return;          // ещё идёт стрим
    if (result) return;             // результат уже установлен
    if (!streamText) return;        // нечего парсить

    try {
      const parsed = JSON.parse(streamText) as AnalysisResult;
      if (parsed?.summary && Array.isArray(parsed.perSupplier)) {
        setResult(parsed);
      }
    } catch {
      // не JSON — оставляем как есть (сырой текст)
    }
  }, [isLoading, result, streamText]);
  
  const runAnalysis = async () => {
  if (!supplierIds.length) return;

  setIsLoading(true);
  setError(null);
  setResult(null);
  setElapsedMs(null);

  const startedAt = performance.now();

  try {
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: draftQuery.trim() || "Подберите лучших поставщиков по качеству, цене и срокам поставки.",
        supplierIds,
      }),
    });

    const data = (await response.json()) as AnalysisResult | { error: string };
    if (!response.ok) {
      throw new Error((data as { error?: string }).error ?? "Ошибка AI-анализа");
    }

    setResult(data as AnalysisResult);
    setElapsedMs(Math.round(performance.now() - startedAt));
  } catch (err) {
    setError(err instanceof Error ? err.message : "Ошибка анализа");
  } finally {
    setIsLoading(false);
  }
};   // ← закрываем runAnalysis

  const copyDraft = async () => {
    if (!result?.draftMessage) return;
    try {
      await navigator.clipboard.writeText(result.draftMessage);
    } catch {
      // no-op for MVP
    }
  };

  const summaryText = useMemo(() => {
    if (!result) return streamText;
    return result.summary;
  }, [result, streamText]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">AI-анализ</h2>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {isOpen ? "Скрыть" : "AI-анализ"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="ai-query" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Запрос для LLM
            </label>
            <textarea
              id="ai-query"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              rows={4}
              placeholder="Например: выбери поставщика с лучшим балансом цены, сроков поставки и сертификации для рынка Петербурга"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={runAnalysis}
                disabled={isLoading || supplierIds.length === 0}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? "Анализирую..." : "Отправить запрос"}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 [animation-delay:240ms]" />
                </span>
                Анализирую поставщиков...
              </div>
            </div>
          ) : null}

          {!isLoading && !result && !error && streamText ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap leading-6 text-slate-700">
              {streamText}
            </div>
          ) : null}

          {error ? (
            <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">{error}</p>
              <button
                type="button"
                onClick={runAnalysis}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
              >
                Повторить
              </button>
            </div>
          ) : null}

          {result ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-slate-500">
                  <span>Summary</span>
                  <span>{formatTime(elapsedMs)} · {model}</span>
                </div>
                <p className="text-sm leading-6 text-slate-700">{summaryText}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-slate-900">По поставщикам</h3>
                {result.perSupplier.map((item) => {
                  const supplierName = getSupplierName(item.id, suppliers);
                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-900">{supplierName}</span>
                        <span className="text-xs text-slate-500">fit {item.fitScore}/10</span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Плюсы</p>
                          <ul className="space-y-1 text-sm text-slate-700">
                            {item.pros.map((pro) => (
                              <li key={pro} className="flex items-start gap-2">
                                <span className="mt-0.5 text-emerald-600">✓</span>
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Минусы</p>
                          <ul className="space-y-1 text-sm text-slate-700">
                            {item.cons.map((con) => (
                              <li key={con} className="flex items-start gap-2">
                                <span className="mt-0.5 text-rose-600">✕</span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
                            <span>Fit score</span>
                            <span>{item.fitScore}/10</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${(item.fitScore / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-900">Рекомендуем</h3>
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{getSupplierName(result.recommendedId, suppliers)}</span>
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{result.reasoning}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-900">Риски</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {result.risks.map((risk) => (
                    <li key={risk} className="flex items-start gap-2">
                      <span className="mt-1 text-amber-500">⚠</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">Черновик письма</h3>
                  <button
                    type="button"
                    onClick={copyDraft}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Скопировать
                  </button>
                </div>
                <textarea
                  value={result.draftMessage}
                  readOnly
                  className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-6 text-slate-700 outline-none"
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
