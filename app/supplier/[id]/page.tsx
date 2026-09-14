import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddToCompareButton } from "@/components/add-to-compare-button";
import { SupplierNotes } from "@/components/supplier-notes";
import { CompareProvider } from "@/components/compare-context";

function parseJsonArray(value?: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!supplier) {
    notFound();
  }

  const categories = parseJsonArray(supplier.categories);
  const certificates = parseJsonArray(supplier.certificates);
  const workRegions = parseJsonArray(supplier.workRegion);

  return (
    <CompareProvider>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              ← Назад к поиску
            </Link>
            <div className="flex items-center gap-3">
              <AddToCompareButton supplierId={supplier.id} />
              {supplier.sourceUrl ? (
                <a
                  href={supplier.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Открыть источник
                </a>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{supplier.name}</h1>
                  {supplier.verified ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Проверен
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-500">{supplier.region} · {supplier.city}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Категории</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.length > 0 ? categories.map((category) => (
                    <span key={category} className="rounded-full bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                      {category}
                    </span>
                  )) : <span className="text-sm text-slate-500">—</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Мин. заказ</p>
                <p className="mt-2 text-sm text-slate-700">{supplier.minOrder ?? "—"}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Цена</p>
                <p className="mt-2 text-sm text-slate-700">{supplier.priceRange ?? "Договорная"}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Контакты</p>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {supplier.contactEmail ? (
                    <a href={`mailto:${supplier.contactEmail}`} className="block hover:text-slate-900">
                      {supplier.contactEmail}
                    </a>
                  ) : null}
                  {supplier.contactPhone ? (
                    <a href={`tel:${supplier.contactPhone}`} className="block hover:text-slate-900">
                      {supplier.contactPhone}
                    </a>
                  ) : null}
                  {supplier.website ? (
                    <a href={supplier.website} target="_blank" rel="noreferrer" className="block hover:text-slate-900">
                      {supplier.website}
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Источник</p>
                <p className="mt-2 text-sm text-slate-700">
                  {supplier.sourceUrl ? (
                    <a href={supplier.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      Открыть ссылку
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Сертификаты</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {certificates.length > 0 ? certificates.map((certificate, index) => (
                    <span key={`${certificate}-${index}`} className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-100">
                      {certificate}
                    </span>
                  )) : <span className="text-sm text-slate-500">Нет</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 xl:col-span-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Условия поставки</p>
                <p className="mt-2 text-sm text-slate-700">{supplier.deliveryTerms ?? "—"}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 xl:col-span-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Регионы работы</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {workRegions.length > 0 ? workRegions.map((region, index) => (
                    <span key={`${region}-${index}`} className="rounded-full bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                      {region}
                    </span>
                  )) : <span className="text-sm text-slate-500">—</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 xl:col-span-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Заметки</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{supplier.notes ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <SupplierNotes supplierId={supplier.id} />
          </div>
        </main>
      </div>
    </CompareProvider>
  );
}
