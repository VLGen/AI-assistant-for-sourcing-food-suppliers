import { z } from "zod";

export const llmAnalysisSchema = z.object({
  summary: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  risks: z.array(z.string()),
  recommendation: z.string(),
  draftEmail: z.string(),
  comparison: z.array(
    z.object({
      name: z.string(),
      score: z.number(),
      verdict: z.string(),
    }),
  ),
});

export type LlmAnalysis = z.infer<typeof llmAnalysisSchema>;

export const llmAnalysisJsonSchema = llmAnalysisSchema.toJSONSchema();
