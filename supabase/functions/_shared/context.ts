import { createSupabaseClient } from "./supabase.ts";
import { getAuthedUser } from "./auth.ts";
import { HttpError } from "./errors.ts";

export async function createContext(req: Request) {
  const supabase = createSupabaseClient(req);
  const user = await getAuthedUser(supabase);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new HttpError(500, "Failed to load user profile");
  }

  return { supabase, user, teamId: (profile?.team_id as string | null) ?? null };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

export function requireTeam(ctx: Context): string {
  if (!ctx.teamId) {
    throw new HttpError(409, "User does not belong to a team");
  }
  return ctx.teamId;
}
