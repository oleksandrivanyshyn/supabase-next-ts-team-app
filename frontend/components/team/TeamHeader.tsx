"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, DoorOpen, LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AvatarStack } from "@/components/team/AvatarStack";
import { useTeam } from "@/hooks/useTeam";
import { useDeleteTeam, useLeaveTeam } from "@/hooks/useTeams";
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
  const leaveTeam = useLeaveTeam();
  const deleteTeam = useDeleteTeam();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const isCreator = !!team && team.createdBy === me.id;

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

  const leaveOrDelete = async (mutateAsync: () => Promise<unknown>, successMessage: string) => {
    try {
      await mutateAsync();
      queryClient.clear();
      toast.success(successMessage);
      router.push("/onboarding");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleLeave = () => leaveOrDelete(() => leaveTeam.mutateAsync(), "You left the team");
  const handleDelete = () => leaveOrDelete(() => deleteTeam.mutateAsync(), "Team deleted");

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

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Team options" />}>
            <DoorOpen className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLeaveOpen(true)}>
              <DoorOpen className="size-4" /> Leave team
            </DropdownMenuItem>
            {isCreator && (
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" /> Delete team
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut className="size-4" />
        </Button>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {team?.name ?? "this team"}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll lose access to this team&apos;s products until you rejoin with an
              invite code. Products you created stay with the team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} disabled={leaveTeam.isPending}>
              {leaveTeam.isPending ? "Leaving..." : "Leave team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {team?.name ?? "this team"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the team and every product in it, for every member.
              This cannot be undone. Type <span className="font-semibold">{team?.name}</span>{" "}
              to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={team?.name}
            aria-label="Type the team name to confirm deletion"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTeam.isPending || deleteConfirmText !== team?.name}
            >
              {deleteTeam.isPending ? "Deleting..." : "Delete team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
