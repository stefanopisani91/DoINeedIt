import { z } from 'zod';

const answer = z.enum(['yes', 'no', 'maybe']);
const category = z.enum([
  'tech',
  'home',
  'kitchen',
  'clothing',
  'sport',
  'media',
  'health',
  'other',
]);
const dimensionScore = z.number().min(0).max(100).nullable();

export const priceSchema = z.object({
  amount: z.number().min(0),
  currency: z.string().min(3).max(3),
});

export const resultSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(['buy', 'wait', 'skip']),
  dimensions: z.object({
    utility: dimensionScore,
    urgency: dimensionScore,
    alternatives: dimensionScore,
    impulse: dimensionScore,
    budget: dimensionScore,
  }),
  confidence: z.number().min(0).max(100),
  drivers: z.array(
    z.object({
      questionId: z.string(),
      text: z.string(),
      answer,
      contribution: z.number(),
    }),
  ),
  // Results stored before the budget criterion have no budget component.
  budget: z
    .object({ share: z.number().min(0), contribution: z.number() })
    .nullable()
    .default(null),
  answeredCount: z.number().int().min(0),
  maybeCount: z.number().int().min(0),
});

export const itemSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  source: z.object({
    url: z.string(),
    asin: z.string().optional(),
    marketplace: z.string().optional(),
  }),
  title: z.string().min(1).max(300),
  imageUrl: z
    .string()
    .max(2000)
    .regex(/^(https?:\/\/|\/)/, 'image must be an absolute URL or a site path')
    .optional(),
  price: priceSchema.optional(),
  category,
  answers: z.record(z.string(), answer),
  askedOrder: z.array(z.string()),
  budget: priceSchema.optional(),
  result: resultSchema,
  engineVersion: z.number().int(),
  note: z.string().max(2000).optional(),
});

export const exportFileSchema = z.object({
  app: z.literal('doineedit'),
  version: z.number().int(),
  exportedAt: z.string(),
  items: z.array(itemSchema),
});

export type ExportFile = z.infer<typeof exportFileSchema>;
