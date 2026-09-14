"use client";

import { useCompare } from "@/components/compare-context";

export function AddToCompareButton({ supplierId }: { supplierId: string }) {
  const { selectedIds, toggleId, maxItems } = useCompare();
  const selected = selectedIds.includes(supplierId);

  const label = selected ? "Убрать из сравнения" : "Добавить в сравнение";

  return (
    <button
      type="button"
      onClick={() => toggleId(supplierId)}
      disabled={!selected && selectedIds.length >= maxItems}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        selected
          ? "bg-emerald-600 text-white hover:bg-emerald-500"
          : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      }`}
    >
      {label}
    </button>
  );
}
