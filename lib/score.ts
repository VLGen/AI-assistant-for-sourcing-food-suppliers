import type { Supplier, SupplierQuery } from "./types";

function parseNumericMinOrder(value?: string | null): number | null {
  if (!value) return null;

  const match = value.match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMinOrderToKg(value?: string | null): number | null {
  if (!value) return null;

  const lower = value.toLowerCase();
  const numeric = parseNumericMinOrder(value);
  if (numeric == null) return null;

  if (lower.includes("тонн")) return numeric * 1000;
  if (lower.includes("кг")) return numeric;
  if (lower.includes("паллет")) return numeric * 400;
  if (lower.includes("шт")) return numeric * 0.5;
  return numeric;
}

function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function preScore(supplier: Supplier, query: SupplierQuery): number {
  const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

  const categoryMatch = query.categories && query.categories.length > 0
    ? query.categories.some((category) =>
        supplier.categories.some((item) => normalize(item) === normalize(category))
      )
      ? 1
      : 0
    : 1;

  const regionMatch = query.region
    ? normalize(query.region) === normalize(supplier.region) ||
        supplier.workRegion.some((region) => normalize(region) === normalize(query.region))
      ? 1
      : 0
    : 1;

  const moqValue = normalizeMinOrderToKg(supplier.minOrder);
  const minOrderMax = query.minOrderMax;
  const moqFit = minOrderMax != null
    ? moqValue == null
      ? 0.5
      : moqValue <= minOrderMax
        ? 1
        : 0
    : 1;

  const hasPrice = supplier.priceRange ? 1 : 0;
  const certificatesScore = Math.min((supplier.certificates?.length ?? 0) / 3, 1);

  const completenessFields = [
    supplier.website,
    supplier.contactEmail,
    supplier.contactPhone,
    supplier.deliveryTerms,
    supplier.priceRange,
    supplier.minOrder,
  ];

  const completeness = completenessFields.filter(Boolean).length / completenessFields.length;

  const score =
    0.3 * categoryMatch +
    0.25 * regionMatch +
    0.15 * moqFit +
    0.1 * hasPrice +
    0.1 * certificatesScore +
    0.1 * completeness;

  return Number(score.toFixed(4));
}

export function normalizeSupplier(raw: Record<string, unknown>): Supplier {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    categories: parseArrayField(raw.categories),
    region: String(raw.region ?? ""),
    city: String(raw.city ?? ""),
    website: typeof raw.website === "string" ? raw.website : null,
    contactEmail: typeof raw.contactEmail === "string" ? raw.contactEmail : null,
    contactPhone: typeof raw.contactPhone === "string" ? raw.contactPhone : null,
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : null,
    minOrder: typeof raw.minOrder === "string" ? raw.minOrder : null,
    priceRange: typeof raw.priceRange === "string" ? raw.priceRange : null,
    certificates: parseArrayField(raw.certificates),
    deliveryTerms: typeof raw.deliveryTerms === "string" ? raw.deliveryTerms : null,
    workRegion: parseArrayField(raw.workRegion),
    notes: typeof raw.notes === "string" ? raw.notes : null,
    verified: Boolean(raw.verified),
  };
}
