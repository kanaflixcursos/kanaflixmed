import { NextResponse } from "next/server";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clinic_team", { target_org: context.organizationId });
  if (error) return NextResponse.json({ error: "TEAM_LOAD_FAILED" }, { status: 500 });
  return NextResponse.json({
    members: ((data ?? []) as { user_id: string; display_name: string | null }[]).map((member) => ({ id: member.user_id, name: member.display_name ?? "Profissional" })),
    currentUserId: context.userId,
    role: context.role,
  });
}
