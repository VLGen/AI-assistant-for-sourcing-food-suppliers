"use client";

import { useEffect, useMemo, useState } from "react";

type Supplier = {
  id: string;
  name: string;
  categories: string[];
  region: string;
  city: string;
  workRegion: string[];
  priceRange?: string | null;
  minOrder?: string | null;
  certificates: string[];
  verified: boolean;
};

type SupplierItem = {
  supplier: Supplier;
  score: number;
};

type AnalysisPayload = {
  summary: string;
  pros: string[];
  cons: string[];
  risks: string[];
  recommendation: string;
  draftEmail: string;
  comparison: Array<{
    name: string;
    score: number;
    verdict: string;
  }>;
};

const categoryOptions = [
  "ингредиенты",
  "готовая продукция",
  "упаковка",
  "оборудование",
  "логистика",
];

const regionOptions = [
  "Москва",
  "Санкт-Петербург",
  "Краснодарский край",
  "Татарстан",
  "Новосибирская область",
  "Свердловская область",
];

export default function SupplierSearch() {
  const [category, setCategory] = useState("ингредиенты");
  const [region, setRegion] = useState("Москва");
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSuppliers = useMemo(
    () => suppliers.filter((item) => selectedIds.includes(item.supplier.id)),
    [selectedIds, suppliers],
  );

  useEffect(() => {
    void loadSuppliers();
  }, [category, region]);

  async function loadSuppliers() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("categories", category);
      params.set("region", region);

      const response = await fetch(`/api/suppliers?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить поставщиков");
      }

      const data = (await response.json()) as { items?: SupplierItem[] };
      setSuppliers(data.items ?? []);
      setSelectedIds((current) => {
        const next = current.filter((id) =>
          (data.items ?? []).some((item) => item.supplier.id === id),
        );
        return next.slice(0, 4);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  function toggleSupplier(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 4) {
        return [...current.slice(1), id];
      }

      return [...current, id];
    });
  }

  async function runAnalysis() {
    if (selectedSuppliers.length < 2) {
      setError("Выберите от 2 до 4 поставщиков для сравнения");
      return;
    }

    setStreaming(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          region,
          suppliers: selectedSuppliers.map((item) => ({
            ...item.supplier,
            score: item.score,
          })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Не удалось получить AI-анализ");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Поток ответа недоступен");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let partialText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\n\n/);
        buffer = events.pop() ?? "";

        for (const eventString of events) {
          const lines = eventString.split(/\n/);
          let eventName = "message";
          let payload = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            }
            if (line.startsWith("data:")) {
              payload = line.replace("data:", "").trim();
            }
          }

          if (!payload) {
            continue;
          }

          const parsed = JSON.parse(payload) as {
            text?: string;
            payload?: AnalysisPayload;
            error?: string;
          };

          if (parsed.text) {
            partialText += parsed.text;
          }

          if (parsed.payload) {
            setAnalysis(parsed.payload);
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }
        }
      }

      if (buffer.trim()) {
        const parsed = JSON.parse(buffer.replace(/^data:/, "")) as { payload?: AnalysisPayload };
        if (parsed.payload) {
          setAnalysis(parsed.payload);
        }
      }

      if (partialText && !analysis) {
        setAnalysis({
          summary: partialText,
          pros: [],
          cons: [],
          risks: [],
          recommendation: "Сформулируйте результат отдельно после завершения потока.",
          draftEmail: "",
          comparison: [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка анализа");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 text-slate-900">
      <header className="rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-200">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Goulash</p>
        <h1 className="mt-3 text-3xl font-semibold">Подбор поставщиков food-продукции</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Ищите по категории и региону, сравнивайте 2–4 поставщика и получайте AI-резюме,
          риски и черновик письма.
        </p>
      </header>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Категория
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-emerald-500"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Регион
          <select
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-emerald-500"
          >
            {regionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col justify-end gap-2 text-sm text-slate-600">
          <span className="font-medium">Выбрано</span>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
            {selectedIds.length} / 4 поставщика
          </div>
        </div>

        <button
          type="button"
          onClick={runAnalysis}
          disabled={streaming || selectedSuppliers.length < 2}
          className="self-end rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {streaming ? "Анализирую..." : "Сравнить"}
        </button>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Результаты поиска</h2>
            <span className="text-sm text-slate-500">
              {loading ? "Загрузка..." : `${suppliers.length} поставщиков`}
            </span>
          </div>

          <div className="space-y-3">
            {suppliers.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Поставщики не найдены по заданным фильтрам.
              </div>
            ) : null}

            {suppliers.map(({ supplier, score }) => {
              const selected = selectedIds.includes(supplier.id);

              return (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => toggleSupplier(supplier.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{supplier.name}</h3>
                        {supplier.verified ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Верифицирован
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {supplier.region} · {supplier.city}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-white">
                      {score.toFixed(2)}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    {supplier.categories.map((categoryName) => (
                      <span
                        key={`${supplier.id}-${categoryName}`}
                        className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200"
                      >
                        {categoryName}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                    <div>
                      <span className="block text-[11px] uppercase tracking-wide text-slate-400">Мин. заказ</span>
                      <span>{supplier.minOrder ?? "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] uppercase tracking-wide text-slate-400">Цена</span>
                      <span>{supplier.priceRange ?? "Договорная"}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] uppercase tracking-wide text-slate-400">Сертификаты</span>
                      <span>{supplier.certificates.length > 0 ? supplier.certificates.join(", ") : "Нет"}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">AI-сравнение</h2>

          {analysis ? (
            <div className="space-y-5 text-sm text-slate-700">
              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Кратко</h3>
                <p className="leading-6">{analysis.summary}</p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Плюсы</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {analysis.pros.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Минусы и риски</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {analysis.cons.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Риски</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {analysis.risks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Рекомендация</h3>
                <p className="leading-6">{analysis.recommendation}</p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Сравнение</h3>
                <div className="space-y-2">
                  {analysis.comparison.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>{item.name}</span>
                      <span className="font-medium">{item.score.toFixed(2)} · {item.verdict}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-900">Черновик письма</h3>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 leading-6 whitespace-pre-line text-slate-700">
                  {analysis.draftEmail}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              {streaming
                ? "LLM готовит краткий разбор и письмо поставщику..."
                : "Выберите 2–4 поставщика и нажмите «Сравнить»"}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
