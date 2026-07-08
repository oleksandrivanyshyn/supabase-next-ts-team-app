import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PresenceMember } from "@/types/types";

type Me = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export function useTeamPresence(teamId?: string, me?: Me) {
  const [members, setMembers] = useState<Record<string, PresenceMember>>({});

  useEffect(() => {
    if (!teamId || !me) return;

    const supabase = createClient();
    const channel = supabase.channel(`presence:${teamId}`, {
      config: { presence: { key: me.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMember>();
        const next: Record<string, PresenceMember> = {};
        for (const [key, metas] of Object.entries(state)) {
          if (metas[0]) next[key] = metas[0];
        }
        setMembers(next);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: me.id,
            displayName: me.displayName,
            avatarUrl: me.avatarUrl,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
    // Depend on the primitive fields, not the `me` object identity, so a new
    // object reference each render doesn't tear down and rejoin the channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, me?.id, me?.displayName, me?.avatarUrl]);

  return { members: Object.values(members) };
}
