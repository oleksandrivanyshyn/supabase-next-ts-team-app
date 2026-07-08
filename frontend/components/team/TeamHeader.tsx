"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarStack } from "@/components/team/AvatarStack";
import { useTeam } from "@/hooks/useTeam";
import { useTeamPresence } from "@/hooks/useTeamPresence";
import { createClient } from "@/lib/supabase/client";

type TeamHeaderProps = {
  teamId: string;
  me: { id: string; displayName: string; avatarUrl: string | null };
};

export function TeamHeader({ teamId, me }: TeamHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { data: team } = useTeam();
  const { members } = useTeamPresence(teamId, me);

  const copyInviteCode = async () => {
    if (!team) return;
    await navigator.clipboard.writeText(team.inviteCode);
    toast.success("Invite code copied");
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="font-semibold">{team?.name ?? "..."}</span>
        {team && (
          <Button variant="outline" size="sm" onClick={copyInviteCode} className="gap-1.5">
            <span className="font-mono text-xs">{team.inviteCode}</span>
            <Copy className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <AvatarStack
          avatars={members.map((m) => ({ name: m.displayName, image: m.avatarUrl ?? "" }))}
        />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
            {theme === "dark" ? (
              <Moon className="size-4" />
            ) : theme === "light" ? (
              <Sun className="size-4" />
            ) : (
              <Monitor className="size-4" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="size-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
