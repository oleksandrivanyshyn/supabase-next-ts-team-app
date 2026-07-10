import type { ZodType } from 'npm:zod@^3.22.4';
import { corsHeaders } from './cors.ts';
import { HttpError } from './errors.ts';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function validate<T>(data: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, 'Validation failed: ' + result.error.message);
  }
  return result.data;
}

export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<T> {
  const body = await req.json().catch(() => ({}));
  return validate(body, schema);
}
