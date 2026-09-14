import type { Analysis } from "@/lib/ai/schema";

type QueryInput = {
  q?: string;
  categories?: string[];
  region?: string;
  hasPrice?: boolean;
  verifiedOnly?: boolean;
  minOrderMax?: number;
};

type SupplierLike = {
  id: string;
  name: string;
  categories: string[];
  region: string;
  city: string;
  minOrder?: string | null;
  priceRange?: string | null;
  certificates: string[];
  deliveryTerms?: string | null;
  workRegion: string[];
  verified: boolean;
};

export function buildAnalysisPrompt(query: QueryInput, suppliers: SupplierLike[]) {
  const systemPrompt = `Ты — опытный закупочный ассистент для food-рынка.
Используй только переданные данные о поставщиках и запросе.
Не выдумывай ни фактов, ни контактов, ни репутации.
Отвечай ТОЛЬКО на русском языке.
Верни корректный JSON в соответствии с заданной схемой.`;

  const userPrompt = JSON.stringify(
    {
      query,
      suppliers: suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        categories: supplier.categories,
        region: supplier.region,
        city: supplier.city,
        minOrder: supplier.minOrder,
        priceRange: supplier.priceRange,
        certificates: supplier.certificates,
        deliveryTerms: supplier.deliveryTerms,
        workRegion: supplier.workRegion,
        verified: supplier.verified,
      })),
    },
    null,
    2,
  );

  return {
    systemPrompt,
    userPrompt,
  };
}
