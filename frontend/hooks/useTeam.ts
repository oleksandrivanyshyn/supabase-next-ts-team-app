import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';
import type { Team, TeamMember } from '@/types/types';

export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: async (): Promise<Team | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('teams')
        .select(
          'id, name, inviteCode:invite_code, createdAt:created_at, createdBy:created_by',
        )
        .maybeSingle<Team>();
      if (error) throw error;
      return data;
    },
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async (): Promise<TeamMember[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, displayName:display_name')
        .overrideTypes<TeamMember[]>();
      if (error) throw error;
      return data;
    },
  });
}
