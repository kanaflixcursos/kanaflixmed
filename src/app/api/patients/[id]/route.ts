import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "INVALID_PATIENT" }, { status: 400 });
  const before = new URL(request.url).searchParams.get("before");
  if (before && Number.isNaN(Date.parse(before))) return NextResponse.json({ error: "INVALID_CURSOR" }, { status: 400 });

  const supabase = await createClient();
  let appointmentQuery = supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, operational_note, price_cents, professional_id, services(name)")
      .eq("patient_id", id)
      .eq("organization_id", context.organizationId)
      .order("starts_at", { ascending: false })
      .limit(31);
  if (before) appointmentQuery = appointmentQuery.lt("starts_at", before);

  const [{ data: patient, error: patientError }, { data: appointments, error: appointmentsError }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, record_number, display_name, legal_name, birth_date, phone_e164, email, notes, active, created_at, updated_at")
      .eq("id", id)
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
    appointmentQuery,
  ]);

  if (patientError) return NextResponse.json({ error: patientError.message }, { status: 500 });
  if (!patient) return NextResponse.json({ error: "PATIENT_NOT_FOUND" }, { status: 404 });
  if (appointmentsError) return NextResponse.json({ error: appointmentsError.message }, { status: 500 });

  const page = appointments ?? [];
  const hasMore = page.length > 30;
  const visibleAppointments = page.slice(0, 30);
  const appointmentIds = visibleAppointments.map((appointment) => appointment.id);
  const professionalIds = [...new Set(visibleAppointments.map((appointment) => appointment.professional_id))];
  const [{ data: statusEvents }, { data: reschedules }, { data: encounters }, { data: professionals }] = await Promise.all([
    appointmentIds.length ? supabase.from("appointment_status_events").select("appointment_id, from_status, to_status, reason, occurred_at").in("appointment_id", appointmentIds).order("occurred_at", { ascending: true }) : Promise.resolve({ data: [] }),
    appointmentIds.length ? supabase.from("appointment_reschedules").select("id, appointment_id, previous_starts_at, starts_at, reason, occurred_at").in("appointment_id", appointmentIds).order("occurred_at", { ascending: true }) : Promise.resolve({ data: [] }),
    appointmentIds.length ? supabase.from("encounters").select("appointment_id, status").in("appointment_id", appointmentIds) : Promise.resolve({ data: [] }),
    professionalIds.length ? supabase.rpc("clinic_team", { target_org: context.organizationId }) : Promise.resolve({ data: [] }),
  ]);
  const professionalNames = new Map(((professionals ?? []) as { user_id: string; display_name: string | null }[]).map((professional) => [professional.user_id, professional.display_name]));
  const eventMap = new Map<string, typeof statusEvents>();
  for (const item of statusEvents ?? []) eventMap.set(item.appointment_id, [...(eventMap.get(item.appointment_id) ?? []), item]);
  const rescheduleMap = new Map<string, typeof reschedules>();
  for (const item of reschedules ?? []) rescheduleMap.set(item.appointment_id, [...(rescheduleMap.get(item.appointment_id) ?? []), item]);
  const encounterMap = new Map((encounters ?? []).map((encounter) => [encounter.appointment_id, encounter.status]));
  const now = new Date().toISOString();

  return NextResponse.json({
    patient,
    timezone: context.timezone,
    appointments: visibleAppointments.map((appointment) => {
      const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
      return {
        id: appointment.id,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
        status: appointment.status,
        isUpcoming: appointment.starts_at > now && ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(appointment.status),
        professionalName: professionalNames.get(appointment.professional_id) ?? "Profissional",
        operationalNote: appointment.operational_note,
        priceCents: appointment.price_cents,
        serviceName: service?.name ?? "Consulta",
        encounterStatus: encounterMap.get(appointment.id) ?? null,
        events: eventMap.get(appointment.id) ?? [],
        reschedules: rescheduleMap.get(appointment.id) ?? [],
      };
    }),
    hasMore,
    nextCursor: hasMore && visibleAppointments.length ? visibleAppointments[visibleAppointments.length - 1].starts_at : null,
  });
}
