import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const createProductSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    imagePath: z.string().optional(),
});

export const updateProductSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    imagePath: z.string().optional(),
    status: z.enum(["active", "deleted"]).optional(),
});