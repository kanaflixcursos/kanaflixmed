import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  professionalTitle: z.string().trim().max(120).optional().default(""),
  councilType: z.string().trim().max(40).optional().default(""),
  councilNumber: z.string().trim().max(60).optional().default(""),
  councilState: z.string().trim().max(2).optional().default(""),
});

export async function GET() {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const supabase = await createClient();
  const [{ data: userData }, { data: membership, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("memberships").select("display_name, professional_title, council_type, council_number, council_state")
      .eq("organization_id", context.organizationId).eq("user_id", context.userId).eq("status", "ACTIVE").maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: "PROFILE_LOAD_FAILED" }, { status: 500 });
  return NextResponse.json({ profile: { ...membership, email: userData.user?.email ?? "" } });
}

export async function PATCH(request: Request) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PROFILE", details: parsed.error.flatten() }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_my_membership", { target_org: context.organizationId, profile_data: parsed.data });
  if (error) return NextResponse.json({ error: "PROFILE_UPDATE_FAILED" }, { status: 500 });
  return NextResponse.json({ profile: data });
}
