"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";

type Supplier = {
  id: string;
  name: string;
  categories: string;
  region: string;
  city: string;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  sourceUrl?: string | null;
  minOrder?: string | null;
  priceRange?: string | null;
  certificates: string;
  deliveryTerms?: string | null;
  workRegion: string;
  notes?: string | null;
  verified: boolean;
};

const FIELD_LABELS: Record<string, string> = {
  categories: "Категории",
  region: "Регион",
  city: "Город",
  minOrder: "Мин. заказ",
  priceRange: "Цена",
  certificates: "Сертификаты",
  deliveryTerms: "Условия доставки",
  workRegion: "Регионы работы",
  verified: "Проверен",
  contacts: "Контакты",
};

function parseJsonArray(value?: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch {
    // ignore parse error and fallback to comma list
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fieldValue(supplier: Supplier, field: string) {
  switch (field) {
    case "categories":
      return parseJsonArray(supplier.categories).join(", ");
    case "certificates":
      return parseJsonArray(supplier.certificates).join(", ");
    case "workRegion":
      return parseJsonArray(supplier.workRegion).join(", ");
    case "verified":
      return supplier.verified ? "Да" : "Нет";
    case "contacts":
      return [supplier.contactEmail, supplier.contactPhone, supplier.website]
        .filter(Boolean)
        .join("; ");
    default:
      return supplier[field as keyof Supplier] ? String(supplier[field as keyof Supplier]) : "—";
  }
}

function compareCellValue(field: string, values: string[]) {
  const nonEmpty = values.filter((value) => value && value !== "—");
  if (nonEmpty.length === 0) return "red";

  if (field === "verified") {
    return values.filter((value) => value === "Да").length > 0 ? "green" : "red";
  }

  if (field === "contacts") {
    return nonEmpty.length >= Math.max(1, values.length / 2) ? "green" : "red";
  }

  const average = nonEmpty.length / values.length;
  return average >= 0.5 ? "green" : "red";
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = (searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (ids.length < 2) {
      setSuppliers([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/suppliers/by-ids?ids=${encodeURIComponent(ids.join(","))}`);
        if (!response.ok) {
          throw new Error("Не удалось загрузить данные для сравнения");
        }

        const payload = (await response.json()) as { items?: Supplier[] };
        setSuppliers(payload.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка сравнения");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [searchParams]);

  const visibleSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => supplier && supplier.id);
  }, [suppliers]);

  const fields = [
    "categories",
    "region",
    "city",
    "minOrder",
    "priceRange",
    "certificates",
    "deliveryTerms",
    "workRegion",
    "verified",
    "contacts",
  ];

  const removeSupplier = (id: string) => {
    const remaining = visibleSuppliers.filter((supplier) => supplier.id !== id);
    setSuppliers(remaining);
  };

  if (visibleSuppliers.length < 2) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Сравнение недоступно</h1>
          <p className="mt-3 text-sm text-slate-600">
            Для сравнения нужно выбрать минимум 2 поставщика.
          </p>
          <Link href="/" className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
            Вернуться к поиску
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Comparison</p>
            <h1 className="text-2xl font-semibold">Сравнение {visibleSuppliers.length} поставщиков</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                if (visibleSuppliers.length < 2) {
                  toast.error("Нужно выбрать минимум 2 поставщика");
                  return;
                }

                try {
                  const response = await fetch("/api/shortlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ supplierIds: visibleSuppliers.map((supplier) => supplier.id) }),
                  });

                  const payload = (await response.json().catch(() => ({}))) as { error?: string };
                  if (!response.ok) {
                    throw new Error(payload.error ?? "Не удалось сохранить подборку");
                  }

                  toast.success("Подборка сохранена");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Ошибка сохранения подборки");
                }
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Сохранить подборку
            </button>
            <Link href="/" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              К поиску
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl overflow-x-auto px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Загрузка сравнения...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              AI-анализ выполнен локально через Ollama (qwen2.5:3b). Время: — сек. Токенов: ~0. Стоимость: $0.
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-3 text-slate-600">
                      Поле
                    </th>
                    {visibleSuppliers.map((supplier) => (
                      <th key={supplier.id} className="border-b border-r border-slate-200 bg-white px-4 py-3 align-top">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{supplier.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{supplier.region}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSupplier(supplier.id)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Убрать
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {fields.map((field) => {
                    const values = visibleSuppliers.map((supplier) => fieldValue(supplier, field));
                    const tone = compareCellValue(field, values);

                    return (
                      <tr key={field} className="align-top">
                        <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700">
                          {FIELD_LABELS[field] ?? field}
                        </td>

                        {visibleSuppliers.map((supplier) => {
                          const value = fieldValue(supplier, field);
                          const cellTone =
                            value === "—" || value === "Нет" || value === "" ? "bg-rose-50 text-rose-700" :
                            tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-700";

                          return (
                            <td key={`${field}-${supplier.id}`} className={`border-b border-r border-slate-200 px-4 py-3 ${cellTone}`}>
                              <div className="max-w-[220px] whitespace-pre-wrap break-words leading-6">
                                {value}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <AIAnalysisPanel supplierIds={visibleSuppliers.map((supplier) => supplier.id)} query={""} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100" /> }>
      <ComparePageContent />
    </Suspense>
  );
}
