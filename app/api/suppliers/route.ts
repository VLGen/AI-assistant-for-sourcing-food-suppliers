import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeSupplier, preScore } from "@/lib/score";
import type { SupplierQuery } from "@/lib/types";

function parseQueryArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query: SupplierQuery = {
    q: searchParams.get("q") ?? undefined,
    categories: parseQueryArray(searchParams.get("categories") ?? undefined),
    region: searchParams.get("region") ?? undefined,
    minOrderMax: searchParams.get("minOrderMax") ? Number(searchParams.get("minOrderMax")) : undefined,
    hasPrice: searchParams.get("hasPrice") === "true" ? true : searchParams.get("hasPrice") === "false" ? false : undefined,
    certificates: parseQueryArray(searchParams.get("certificates") ?? undefined),
    verifiedOnly: searchParams.get("verifiedOnly") === "true",
  };

  const rows = await prisma.supplier.findMany();
  const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

  const items = rows
    .map((row) => normalizeSupplier(row as Record<string, unknown>))
    .filter((supplier) => {
      if (query.q) {
        const text = `${supplier.name} ${supplier.categories.join(" ")} ${supplier.region} ${supplier.city}`.toLowerCase();
        if (!text.includes(query.q.toLowerCase())) return false;
      }

      if (query.categories && query.categories.length > 0) {
        const match = query.categories.some((category) =>
          supplier.categories.some((item) => normalize(item) === normalize(category))
        );
        if (!match) return false;
      }

      if (query.region) {
        const regionMatch = normalize(supplier.region) === normalize(query.region)
          || supplier.workRegion.some((region) => normalize(region) === normalize(query.region));
        if (!regionMatch) return false;
      }

      if (query.certificates && query.certificates.length > 0) {
        const match = query.certificates.some((certificate) =>
          supplier.certificates.some((item) => normalize(item) === normalize(certificate))
        );
        if (!match) return false;
      }

      if (query.verifiedOnly && !supplier.verified) return false;

      if (query.hasPrice === true && !supplier.priceRange) return false;

      if (query.minOrderMax != null) {
        const numeric = supplier.minOrder ? (() => {
          const match = supplier.minOrder.match(/\d+(?:[.,]\d+)?/);
          if (!match) return null;
          const value = Number(match[0].replace(",", "."));
          if (supplier.minOrder.toLowerCase().includes("тонн")) return value * 1000;
          if (supplier.minOrder.toLowerCase().includes("кг")) return value;
          if (supplier.minOrder.toLowerCase().includes("паллет")) return value * 400;
          if (supplier.minOrder.toLowerCase().includes("шт")) return value * 0.5;
          return value;
        })() : null;

        if (numeric == null) return false;
        if (numeric > query.minOrderMax) return false;
      }

      return true;
    })
    .map((supplier) => ({ supplier, score: preScore(supplier, query) }))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ items });
}
