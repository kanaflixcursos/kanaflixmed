import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { localDateTimeToUtc } from "@/lib/date-time";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const rescheduleSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  localTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  version: z.number().int().positive(),
  reason: z.string().trim().max(500).optional().default(""),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "INVALID_APPOINTMENT" }, { status: 400 });

  const supabase = await createClient();
  const { data: appointment, error } = await supabase.from("appointments")
    .select("id, organization_id, patient_id, service_id, professional_id, starts_at, ends_at, status, operational_note, price_cents, version, patients(display_name, record_number), services(name, duration_minutes)")
    .eq("id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (error) return NextResponse.json({ error: "APPOINTMENT_LOAD_FAILED" }, { status: 500 });
  if (!appointment) return NextResponse.json({ error: "APPOINTMENT_NOT_FOUND" }, { status: 404 });

  const [{ data: events }, { data: reschedules }, { data: team }, { data: encounter }] = await Promise.all([
    supabase.from("appointment_status_events").select("from_status, to_status, reason, occurred_at").eq("appointment_id", id).order("occurred_at", { ascending: true }),
    supabase.from("appointment_reschedules").select("previous_starts_at, starts_at, reason, occurred_at").eq("appointment_id", id).order("occurred_at", { ascending: true }),
    supabase.rpc("clinic_team", { target_org: context.organizationId }),
    supabase.from("encounters").select("status, professional_id, version").eq("appointment_id", id).maybeSingle(),
  ]);
  const patient = Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients;
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  const professional = (team as { user_id: string; display_name: string | null }[] | null)?.find((member) => member.user_id === appointment.professional_id);
  return NextResponse.json({
    timezone: context.timezone,
    appointment: {
      id: appointment.id, patientId: appointment.patient_id, patientName: patient?.display_name ?? "Paciente",
      recordNumber: patient?.record_number ?? null, serviceName: service?.name ?? "Consulta",
      durationMinutes: service?.duration_minutes ?? 30, professionalId: appointment.professional_id,
      professionalName: professional?.display_name ?? "Profissional", startsAt: appointment.starts_at,
      endsAt: appointment.ends_at, status: appointment.status, operationalNote: appointment.operational_note,
      priceCents: appointment.price_cents, version: appointment.version,
    },
    events: events ?? [],
    reschedules: reschedules ?? [],
    encounter: encounter ? { status: encounter.status, version: encounter.version, professionalId: encounter.professional_id } : null,
    permissions: { canWriteEncounter: context.userId === appointment.professional_id, isAdmin: context.role === "ADMIN" },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "INVALID_APPOINTMENT" }, { status: 400 });
  const parsed = rescheduleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_RESCHEDULE" }, { status: 400 });

  let newStartsAt: string;
  try { newStartsAt = localDateTimeToUtc(parsed.data.localDate, parsed.data.localTime, context.timezone); }
  catch { return NextResponse.json({ error: "INVALID_LOCAL_DATETIME" }, { status: 400 }); }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reschedule_appointment_atomic", {
    target_appointment: id,
    expected_version: parsed.data.version,
    new_starts_at: newStartsAt,
    change_reason: parsed.data.reason,
  });
  if (error) {
    const known = ["APPOINTMENT_NOT_FOUND", "APPOINTMENT_FORBIDDEN", "APPOINTMENT_CONFLICT", "APPOINTMENT_MUST_BE_FUTURE", "RESCHEDULE_NOT_ALLOWED", "APPOINTMENT_TIME_UNCHANGED"];
    const code = known.find((item) => error.message.includes(item)) ?? "RESCHEDULE_FAILED";
    return NextResponse.json({ error: code }, { status: code === "APPOINTMENT_NOT_FOUND" ? 404 : code === "APPOINTMENT_FORBIDDEN" ? 403 : code === "RESCHEDULE_FAILED" ? 500 : 409 });
  }
  return NextResponse.json({ appointment: data });
}
