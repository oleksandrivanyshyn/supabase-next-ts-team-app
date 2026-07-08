import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingTabs } from "@/components/team/OnboardingTabs";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (profile?.team_id) redirect("/products");

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <OnboardingTabs />
      </div>
    </div>
  );
}
