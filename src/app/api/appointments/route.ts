import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";
import { addLocalDays, clinicToday, getLocalDateBounds, localDateTimeToUtc } from "@/lib/date-time";

const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  localTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  professionalId: z.string().uuid().optional(),
  operationalNote: z.string().trim().max(2000).optional().default(""),
});
const appointmentStatusSchema = z.enum(["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED"]);
const appointmentStatusUpdateSchema = z.object({ id: z.string().uuid(), status: appointmentStatusSchema, version: z.number().int().positive(), reason: z.string().trim().max(500).optional().default("") });

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const date = request.nextUrl.searchParams.get("date");
  const startDate = request.nextUrl.searchParams.get("start") ?? date ?? clinicToday(context.timezone);
  const endDate = request.nextUrl.searchParams.get("end") ?? addLocalDays(startDate, 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "INVALID_DATE_RANGE" }, { status: 400 });
  }
  const dayCount = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000;
  if (dayCount < 1 || dayCount > 42) return NextResponse.json({ error: "INVALID_DATE_RANGE" }, { status: 400 });
  const bounds = getLocalDateBounds(startDate, context.timezone);
  const endBounds = getLocalDateBounds(endDate, context.timezone);
  const professionalId = request.nextUrl.searchParams.get("professionalId");
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, operational_note, price_cents, version, patient_id, service_id, professional_id, patients(display_name), services(name, duration_minutes)")
    .eq("organization_id", context.organizationId)
    .lt("starts_at", endBounds.start)
    .gt("ends_at", bounds.start)
    .order("starts_at", { ascending: true });
  if (professionalId && z.string().uuid().safeParse(professionalId).success) query = query.eq("professional_id", professionalId);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const professionalIds = [...new Set((data ?? []).map((appointment) => appointment.professional_id))];
  const { data: memberships } = professionalIds.length
    ? await supabase.from("memberships").select("user_id, display_name").eq("organization_id", context.organizationId).in("user_id", professionalIds)
    : { data: [] as { user_id: string; display_name: string | null }[] };
  const professionalNames = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.display_name]));

  const appointments = (data ?? []).map((appointment) => {
    const patient = Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients;
    const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
    return {
      id: appointment.id,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      status: appointment.status,
      version: appointment.version,
      operationalNote: appointment.operational_note,
      priceCents: appointment.price_cents,
      patientId: appointment.patient_id,
      patientName: patient?.display_name ?? "Paciente sem nome",
      serviceId: appointment.service_id,
      serviceName: service?.name ?? "Consulta",
      durationMinutes: service?.duration_minutes ?? 30,
      professionalId: appointment.professional_id,
      professionalName: professionalNames.get(appointment.professional_id) ?? "Profissional",
    };
  });

  return NextResponse.json({ appointments });
}

export async function POST(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const parsed = appointmentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_APPOINTMENT", details: parsed.error.flatten() }, { status: 400 });

  const values = parsed.data;
  let startsAt: string;
  try { startsAt = localDateTimeToUtc(values.localDate, values.localTime, context.timezone); }
  catch { return NextResponse.json({ error: "INVALID_LOCAL_DATETIME" }, { status: 400 }); }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_appointment_atomic", {
    target_org: context.organizationId,
    target_patient: values.patientId,
    target_service: values.serviceId,
    target_starts_at: startsAt,
    target_professional: values.professionalId ?? context.userId,
    target_note: values.operationalNote,
  });
  if (error) {
    const known = ["PATIENT_NOT_FOUND", "SERVICE_NOT_FOUND", "PROFESSIONAL_NOT_FOUND", "APPOINTMENT_CONFLICT", "APPOINTMENT_MUST_BE_FUTURE", "APPOINTMENT_FORBIDDEN"];
    const code = known.find((item) => error.message.includes(item)) ?? "APPOINTMENT_SAVE_FAILED";
    const status = code === "APPOINTMENT_CONFLICT" ? 409 : code.endsWith("NOT_FOUND") ? 400 : code === "APPOINTMENT_FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: code }, { status });
  }
  return NextResponse.json({ appointment: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const parsed = appointmentStatusUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_APPOINTMENT_STATUS", details: parsed.error.flatten() }, { status: 400 });

  const { id, status: nextStatus, version, reason } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("transition_appointment_atomic", {
    target_appointment: id,
    expected_version: version,
    next_status: nextStatus,
    change_reason: reason,
  });
  if (error) {
    const known = ["APPOINTMENT_NOT_FOUND", "APPOINTMENT_FORBIDDEN", "INVALID_STATUS_TRANSITION", "APPOINTMENT_CONFLICT", "REASON_REQUIRED"];
    const code = known.find((item) => error.message.includes(item)) ?? "APPOINTMENT_UPDATE_FAILED";
    return NextResponse.json({ error: code }, { status: code === "APPOINTMENT_NOT_FOUND" ? 404 : code === "APPOINTMENT_FORBIDDEN" ? 403 : code === "APPOINTMENT_UPDATE_FAILED" ? 500 : 409 });
  }
  return NextResponse.json({ appointment: data });
}
