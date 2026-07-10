import { z } from 'npm:zod@^3.22.4';

export const createTeamSchema = z.object({
  name: z.string().min(1).max(80),
});

export const joinTeamSchema = z.object({
  inviteCode: z.string().length(6),
});
