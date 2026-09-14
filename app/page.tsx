"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CompareProvider, useCompare } from "@/components/compare-context";
import { SupplierCard } from "@/components/supplier-card";

type Supplier = {
  id: string;
  name: string;
  categories: string[];
  region: string;
  city: string;
  minOrder?: string | null;
  priceRange?: string | null;
  certificates: string[];
  verified: boolean;
  score: number;
};

const CATEGORY_OPTIONS = [
  "ингредиенты",
  "готовая продукция",
  "упаковка",
  "оборудование",
  "логистика",
];

const REGION_OPTIONS = [
  "Москва",
  "Санкт-Петербург",
  "Краснодарский край",
  "Татарстан",
  "Новосибирская область",
  "Свердловская область",
];

function parseArrayParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function PageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedIds } = useCompare();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [categories, setCategories] = useState<string[]>(parseArrayParam(searchParams.get("categories")));
  const [region, setRegion] = useState(searchParams.get("region") ?? "");
  const [onlyWithPrice, setOnlyWithPrice] = useState(searchParams.get("hasPrice") === "true");
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get("verifiedOnly") === "true");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set("q", query);
      else params.delete("q");

      if (categories.length > 0) params.set("categories", categories.join(","));
      else params.delete("categories");

      if (region) params.set("region", region);
      else params.delete("region");

      params.set("hasPrice", String(onlyWithPrice));
      params.set("verifiedOnly", String(verifiedOnly));

      router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, categories, region, onlyWithPrice, verifiedOnly, pathname, router, searchParams]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (categories.length > 0) params.set("categories", categories.join(","));
        if (region) params.set("region", region);
        if (onlyWithPrice) params.set("hasPrice", "true");
        if (verifiedOnly) params.set("verifiedOnly", "true");

        const response = await fetch(`/api/suppliers?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Не удалось загрузить поставщиков");
        }

        const data = (await response.json()) as { items?: Array<{ supplier: Supplier; score: number }> };
        const normalized = (data.items ?? []).map((item) => ({
          ...item.supplier,
          score: Number(item.score ?? 0),
        }));
        setSuppliers(normalized);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [query, categories, region, onlyWithPrice, verifiedOnly]);

  const toggleCategory = (value: string) => {
    setCategories((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const resetFilters = () => {
    setQuery("");
    setCategories([]);
    setRegion("");
    setOnlyWithPrice(false);
    setVerifiedOnly(false);
  };

  const totalSelectedLabel = useMemo(() => {
    if (selectedIds.length === 0) return "0 выбрано";
    return `${selectedIds.length} выбрано`;
  }, [selectedIds.length]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight">Food Supplier Finder</h1>
          <Link href="/shortlist" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
            /shortlist
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Фильтры</h2>

            <div className="mt-5 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                Поиск по имени
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Например: Агро"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                />
              </label>

              <div>
                <p className="text-sm font-medium text-slate-700">Категории</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((option) => {
                    const active = categories.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleCategory(option)}
                        className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
                          active
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Регион
                <select
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                >
                  <option value="">Любой регион</option>
                  {REGION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-3 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onlyWithPrice}
                    onChange={(event) => setOnlyWithPrice(event.target.checked)}
                  />
                  Только с ценой
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(event) => setVerifiedOnly(event.target.checked)}
                  />
                  Только проверенные
                </label>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Сбросить
              </button>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold">Поставщики</h2>
                <p className="text-sm text-slate-500">
                  {loading ? "Загрузка..." : `${suppliers.length} найдено`}
                </p>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {suppliers.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} />
              ))}
            </div>

            {!loading && suppliers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                По заданным фильтрам ничего не найдено.
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {selectedIds.length >= 2 ? (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-600 px-4 py-3 text-white shadow-lg shadow-emerald-900/15">
            <span className="text-sm font-medium">{totalSelectedLabel}</span>
            <Link
              href={`/compare?ids=${selectedIds.join(",")}`}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Сравнить
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100" /> }>
      <CompareProvider>
        <PageContent />
      </CompareProvider>
    </Suspense>
  );
}
