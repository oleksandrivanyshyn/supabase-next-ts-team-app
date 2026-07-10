import { createClient } from 'npm:@supabase/supabase-js@2';
import type { Database } from './database.types.ts';

export function createSupabaseAdminClient() {
  return createClient<Database>(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
