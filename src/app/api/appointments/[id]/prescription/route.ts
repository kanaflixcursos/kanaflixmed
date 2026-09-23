import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const uuid = z.string().uuid();
const saveSchema = z.object({ body: z.string().trim().min(1).max(10000), version: z.number().int().nonnegative() });

async function getAccess(id: string) {
  const context = await getDashboardContext();
  if (!context) return { error: "AUTH_REQUIRED", status: 401 } as const;
  if (!uuid.safeParse(id).success) return { error: "INVALID_APPOINTMENT", status: 400 } as const;
  const supabase = await createClient();
  const { data, error } = await supabase.from("appointments")
    .select("id, patient_id, professional_id, status, patients(display_name, legal_name)")
    .eq("id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (error) return { error: "APPOINTMENT_LOAD_FAILED", status: 500 } as const;
  if (!data) return { error: "APPOINTMENT_NOT_FOUND", status: 404 } as const;
  if (data.professional_id !== context.userId && context.role !== "ADMIN") return { error: "PRESCRIPTION_FORBIDDEN", status: 403 } as const;
  return { context, appointment: data, supabase };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { context, appointment, supabase } = access;
  const [{ data: prescription, error }, { data: professional }, { data: clinic }, { data: encounter }] = await Promise.all([
    supabase.from("prescriptions").select("id, body, version, created_at, updated_at").eq("appointment_id", id).eq("organization_id", context.organizationId).maybeSingle(),
    supabase.from("memberships").select("display_name, professional_title, council_type, council_number, council_state").eq("user_id", appointment.professional_id).eq("organization_id", context.organizationId).maybeSingle(),
    supabase.from("organizations").select("name, address, phone").eq("id", context.organizationId).maybeSingle(),
    supabase.from("encounters").select("status").eq("appointment_id", id).maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: "PRESCRIPTION_LOAD_FAILED" }, { status: 500 });
  const patient = Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients;
  return NextResponse.json({
    prescription,
    context: { patientName: patient?.legal_name || patient?.display_name || "Paciente", professionalName: professional?.display_name || "Profissional", professionalTitle: professional?.professional_title || "", councilType: professional?.council_type || "", councilNumber: professional?.council_number || "", councilState: professional?.council_state || "", clinicName: clinic?.name || context.organizationName, clinicAddress: clinic?.address || "", clinicPhone: clinic?.phone || "", timezone: context.timezone },
    canEdit: appointment.professional_id === context.userId && ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(appointment.status) && encounter?.status !== "FINALIZED",
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { context, appointment, supabase } = access;
  if (appointment.professional_id !== context.userId) return NextResponse.json({ error: "PRESCRIPTION_FORBIDDEN" }, { status: 403 });
  if (!["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(appointment.status)) return NextResponse.json({ error: "APPOINTMENT_NOT_IN_CARE" }, { status: 409 });
  const { data: encounter } = await supabase.from("encounters").select("status").eq("appointment_id", id).maybeSingle();
  if (encounter?.status === "FINALIZED") return NextResponse.json({ error: "ENCOUNTER_FINALIZED" }, { status: 409 });
  const parsed = saveSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PRESCRIPTION" }, { status: 400 });

  const values = parsed.data;
  const result = values.version === 0
    ? await supabase.from("prescriptions").insert({ organization_id: context.organizationId, appointment_id: id, patient_id: appointment.patient_id, professional_id: context.userId, body: values.body }).select("id, body, version, created_at, updated_at").single()
    : await supabase.from("prescriptions").update({ body: values.body, version: values.version + 1 }).eq("organization_id", context.organizationId).eq("appointment_id", id).eq("version", values.version).select("id, body, version, created_at, updated_at").maybeSingle();
  if (result.error) return NextResponse.json({ error: result.error.code === "23505" ? "PRESCRIPTION_CONFLICT" : "PRESCRIPTION_SAVE_FAILED" }, { status: result.error.code === "23505" ? 409 : 500 });
  if (!result.data) return NextResponse.json({ error: "PRESCRIPTION_CONFLICT" }, { status: 409 });
  await supabase.from("audit_events").insert({ organization_id: context.organizationId, actor_user_id: context.userId, action: "PRESCRIPTION_DRAFT_SAVED", resource_type: "APPOINTMENT", resource_id: id });
  return NextResponse.json({ prescription: result.data });
}
