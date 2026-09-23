import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const clinicSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().default(""),
  contactEmail: z.union([z.literal(""), z.string().trim().email().max(254)]).optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
});

export async function GET() {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations")
    .select("name, slug, timezone, phone, contact_email, address")
    .eq("id", context.organizationId).maybeSingle();
  if (error) return NextResponse.json({ error: "CLINIC_LOAD_FAILED" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "CLINIC_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ clinic: data, canEdit: context.role === "ADMIN" });
}

export async function PATCH(request: Request) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (context.role !== "ADMIN") return NextResponse.json({ error: "CLINIC_FORBIDDEN" }, { status: 403 });
  const parsed = clinicSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CLINIC", details: parsed.error.flatten() }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_clinic_profile", { target_org: context.organizationId, clinic_data: parsed.data });
  if (error) {
    const code = error.message.includes("INVALID_TIMEZONE") ? "INVALID_TIMEZONE" : "CLINIC_UPDATE_FAILED";
    return NextResponse.json({ error: code }, { status: code === "INVALID_TIMEZONE" ? 400 : 500 });
  }
  return NextResponse.json({ clinic: data });
}
