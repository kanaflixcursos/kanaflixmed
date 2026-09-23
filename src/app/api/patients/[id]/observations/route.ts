import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
const observationSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "INVALID_PATIENT" }, { status: 400 });
  const before = new URL(request.url).searchParams.get("before");
  if (before && Number.isNaN(Date.parse(before))) return NextResponse.json({ error: "INVALID_CURSOR" }, { status: 400 });

  const supabase = await createClient();
  const { data: patient, error: patientError } = await supabase.from("patients").select("id").eq("id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (patientError) return NextResponse.json({ error: patientError.message }, { status: 500 });
  if (!patient) return NextResponse.json({ error: "PATIENT_NOT_FOUND" }, { status: 404 });

  let query = supabase.from("patient_observations").select("id, body, author_name, created_at")
    .eq("organization_id", context.organizationId).eq("patient_id", id).order("created_at", { ascending: false }).limit(31);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const observations = (data ?? []).slice(0, 30);
  return NextResponse.json({ observations, hasMore: (data?.length ?? 0) > 30, nextCursor: (data?.length ?? 0) > 30 ? observations.at(-1)?.created_at : null });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "INVALID_PATIENT" }, { status: 400 });
  const parsed = observationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_OBSERVATION" }, { status: 400 });

  const supabase = await createClient();
  const [{ data: patient, error: patientError }, { data: member, error: memberError }] = await Promise.all([
    supabase.from("patients").select("id").eq("id", id).eq("organization_id", context.organizationId).eq("active", true).maybeSingle(),
    supabase.from("memberships").select("display_name").eq("organization_id", context.organizationId).eq("user_id", context.userId).eq("status", "ACTIVE").maybeSingle(),
  ]);
  if (patientError || memberError) return NextResponse.json({ error: "OBSERVATION_LOOKUP_FAILED" }, { status: 500 });
  if (!patient) return NextResponse.json({ error: "PATIENT_NOT_FOUND" }, { status: 404 });
  const { data, error } = await supabase.from("patient_observations").insert({
    organization_id: context.organizationId, patient_id: id, body: parsed.data.body,
    author_user_id: context.userId, author_name: member?.display_name?.trim() || "Profissional da clínica",
  }).select("id, body, author_name, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("audit_events").insert({ organization_id: context.organizationId, actor_user_id: context.userId, action: "PATIENT_OBSERVATION_CREATED", resource_type: "PATIENT", resource_id: id });
  return NextResponse.json({ observation: data }, { status: 201 });
}
