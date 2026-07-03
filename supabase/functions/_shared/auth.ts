import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./errors.ts";

export async function getAuthedUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, "Unauthorized");
  }

  return user;
}
