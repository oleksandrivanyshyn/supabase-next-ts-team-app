import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import type { PresenceMember } from '@/types/types';

type Me = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export function useTeamPresence(teamId?: string, me?: Me) {
  const [members, setMembers] = useState<Record<string, PresenceMember>>({});
  const meId = me?.id;
  const meDisplayName = me?.displayName;
  const meAvatarUrl = me?.avatarUrl ?? null;

  useEffect(() => {
    if (!teamId || !meId) return;

    const supabase = createClient();
    const channel = supabase.channel(`presence:${teamId}`, {
      config: { presence: { key: meId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceMember>();
        const next: Record<string, PresenceMember> = {};
        for (const [key, metas] of Object.entries(state)) {
          if (metas[0]) next[key] = metas[0];
        }
        setMembers(next);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: meId,
            displayName: meDisplayName,
            avatarUrl: meAvatarUrl,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [teamId, meId, meDisplayName, meAvatarUrl]);

  return { members: Object.values(members) };
}
