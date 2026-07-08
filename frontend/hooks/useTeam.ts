import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Team, TeamMember } from "@/types/types";

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async (): Promise<Team> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, inviteCode:invite_code, createdAt:created_at")
        .single();
      if (error) throw error;
      return data as unknown as Team;
    },
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async (): Promise<TeamMember[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, displayName:display_name");
      if (error) throw error;
      return data as unknown as TeamMember[];
    },
  });
}
