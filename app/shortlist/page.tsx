import Link from "next/link";
import { prisma } from "@/lib/prisma";

function parseSupplierIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

async function deleteShortlist(id: string) {
  "use server";

  try {
    await prisma.shortlist.delete({ where: { id } });
  } catch (error) {
    const isNotFound = error instanceof Error && error.message.includes("Record to delete does not exist");
    if (!isNotFound) {
      throw error;
    }
  }
}

export default async function ShortlistPage() {
  const items = await prisma.shortlist.findMany({
    orderBy: { createdAt: "desc" },
  });

  const shortlistedSuppliers = await Promise.all(
    items.map(async (item) => {
      const ids = parseSupplierIds(item.supplierIds);
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: ids } },
        orderBy: { name: "asc" },
      });

      return {
        id: item.id,
        createdAt: item.createdAt,
        suppliers,
      };
    }),
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Shortlist</p>
            <h1 className="text-2xl font-semibold">Сохранённые подборки</h1>
          </div>

          <Link href="/" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
            К поиску
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {shortlistedSuppliers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Сохранённых подборок пока нет.
          </div>
        ) : (
          <div className="space-y-5">
            {shortlistedSuppliers.map((entry) => (
              <div key={entry.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Дата</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {new Date(entry.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <form action={async () => {
                    "use server";
                    await deleteShortlist(entry.id);
                  }}>
                    <button
                      type="submit"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Удалить подборку
                    </button>
                  </form>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {entry.suppliers.map((supplier) => (
                    <Link
                      key={supplier.id}
                      href={`/supplier/${supplier.id}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{supplier.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{supplier.region}</p>
                        </div>
                        {supplier.verified ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                            Проверен
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-700">
                        <p>{supplier.city}</p>
                        <p>{supplier.minOrder ?? "—"}</p>
                        <p>{supplier.priceRange ?? "—"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
