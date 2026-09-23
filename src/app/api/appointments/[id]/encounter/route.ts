import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

const fields = {
  chiefComplaint: z.string().trim().max(5000).optional().default(""),
  history: z.string().trim().max(12000).optional().default(""),
  medicalHistory: z.string().trim().max(12000).optional().default(""),
  allergies: z.string().trim().max(5000).optional().default(""),
  physicalExam: z.string().trim().max(12000).optional().default(""),
  assessment: z.string().trim().max(12000).optional().default(""),
  plan: z.string().trim().max(12000).optional().default(""),
  additionalNotes: z.string().trim().max(12000).optional().default(""),
};
const saveSchema = z.object({ ...fields, version: z.number().int().nonnegative().default(0), finalize: z.boolean().default(false) });
const idSchema = z.string().uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "INVALID_APPOINTMENT" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("encounters")
    .select("id, appointment_id, professional_id, status, chief_complaint, history, medical_history, allergies, physical_exam, assessment, plan, additional_notes, version, finalized_at")
    .eq("appointment_id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (error) return NextResponse.json({ error: "ENCOUNTER_LOAD_FAILED" }, { status: 500 });
  if (data && context.userId !== data.professional_id && context.role !== "ADMIN") {
    return NextResponse.json({ error: "ENCOUNTER_FORBIDDEN" }, { status: 403 });
  }
  return NextResponse.json({ encounter: data });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "INVALID_APPOINTMENT" }, { status: 400 });
  const parsed = saveSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_ENCOUNTER", details: parsed.error.flatten() }, { status: 400 });
  const { version, finalize, ...encounterData } = parsed.data;
  const supabase = await createClient();
  const { data: appointment, error: appointmentError } = await supabase.from("appointments")
    .select("status").eq("id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (appointmentError) return NextResponse.json({ error: "APPOINTMENT_LOAD_FAILED" }, { status: 500 });
  if (!appointment) return NextResponse.json({ error: "APPOINTMENT_NOT_FOUND" }, { status: 404 });
  if (!["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(appointment.status)) return NextResponse.json({ error: "APPOINTMENT_NOT_IN_CARE" }, { status: 409 });
  const { data, error } = await supabase.rpc("save_encounter_atomic", {
    target_appointment: id,
    expected_version: version,
    encounter_data: encounterData,
    finalize_encounter: finalize,
  });
  if (error) {
    const known = ["APPOINTMENT_NOT_FOUND", "ENCOUNTER_FORBIDDEN", "ENCOUNTER_FINALIZED", "ENCOUNTER_CONFLICT", "APPOINTMENT_NOT_COMPLETED"];
    const code = known.find((item) => error.message.includes(item)) ?? "ENCOUNTER_SAVE_FAILED";
    return NextResponse.json({ error: code }, { status: code === "APPOINTMENT_NOT_FOUND" ? 404 : code === "ENCOUNTER_FORBIDDEN" ? 403 : code === "ENCOUNTER_SAVE_FAILED" ? 500 : 409 });
  }
  return NextResponse.json({ encounter: data });
}
