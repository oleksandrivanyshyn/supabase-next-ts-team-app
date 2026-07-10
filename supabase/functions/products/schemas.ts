import { z } from 'npm:zod@^3.22.4';

export const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  imagePath: z.string().optional(),
});

export const updateProductSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  imagePath: z.string().optional(),
  status: z.enum(['active', 'deleted']).optional(),
});

const isoDateLike = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

export const productListQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'deleted']).optional(),
  dateFrom: isoDateLike.optional(),
  dateTo: isoDateLike.optional(),
  createdBy: z.string().uuid().optional(),
  search: z.string().optional(),
});
