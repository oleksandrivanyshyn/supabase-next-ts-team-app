import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const createTeamSchema = z.object({
    name: z.string().min(1).max(80),
});

export const joinTeamSchema = z.object({
    inviteCode: z.string().length(6),
});