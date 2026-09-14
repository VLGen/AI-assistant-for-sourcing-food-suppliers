"use client";

import Link from "next/link";
import { useCompare } from "@/components/compare-context";

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
  score?: number;
};

export function SupplierCard({ supplier }: { supplier: Supplier }) {
  const { selectedIds, toggleId } = useCompare();
  const isSelected = selectedIds.includes(supplier.id);
  const score = Number.isFinite(supplier.score) ? supplier.score ?? 0 : 0;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{supplier.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{supplier.region}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{supplier.city}</span>
            {supplier.verified ? (
              <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700">
                Проверен
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-white">
          {score.toFixed(2)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {supplier.categories.map((category) => (
          <span key={`${supplier.id}-${category}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
            {category}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <span className="block text-[11px] uppercase tracking-wide text-slate-400">Мин. заказ</span>
          <span>{supplier.minOrder ?? "—"}</span>
        </div>
        <div>
          <span className="block text-[11px] uppercase tracking-wide text-slate-400">Цена</span>
          <span>{supplier.priceRange ?? "Договорная"}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Score</span>
          <span>{score.toFixed(2)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(score * 100, 100)}%` }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {supplier.certificates.length > 0 ? (
          supplier.certificates.slice(0, 3).map((certificate) => (
            <span key={`${supplier.id}-${certificate}`} className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-emerald-100">
              {certificate}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">Сертификаты отсутствуют</span>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Link
          href={`/supplier/${supplier.id}`}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Подробнее
        </Link>

        <button
          type="button"
          onClick={() => toggleId(supplier.id)}
          className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition ${
            isSelected
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
          }`}
        >
          {isSelected ? "Убрать" : "В сравнение"}
        </button>
      </div>
    </article>
  );
}
