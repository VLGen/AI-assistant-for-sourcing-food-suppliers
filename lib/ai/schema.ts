import { z } from "zod";

export const AnalysisSchema = z.object({
  summary: z.string().describe("Краткое резюме по выборке поставщиков"),
  perSupplier: z.array(
    z.object({
      id: z.string(),
      pros: z.array(z.string()).describe("2–3 плюса"),
      cons: z.array(z.string()).describe("1–2 минуса"),
      fitScore: z.number().min(0).max(10).describe("Оценка соответствия запросу"),
    }),
  ),
  recommendedId: z.string().describe("ID лучшего поставщика"),
  reasoning: z.string().describe("Обоснование выбора"),
  risks: z.array(z.string()).describe("Риски по выборке"),
  draftMessage: z.string().describe("Черновик первого письма поставщику"),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
