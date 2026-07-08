import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamHeader } from "@/components/team/TeamHeader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.team_id) redirect("/onboarding");

  return (
    <div className="min-h-svh flex flex-col">
      <TeamHeader
        teamId={profile.team_id}
        me={{
          id: user.id,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
        }}
      />
      {children}
    </div>
  );
}
