import { FunctionsHttpError } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

type CallOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
};

export async function callFunction<T>(
  path: string,
  options: CallOptions = {},
): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(path, {
    method: options.method ?? 'POST',
    body: options.body,
  });

  if (error) {
    let message = 'Something went wrong. Please try again.';
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch {}
    }
    throw new Error(message);
  }

  return data as T;
}
