import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

const timestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Data inválida");
const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: timestamp,
  endsAt: timestamp,
  operationalNote: z.string().trim().max(2000).optional().default(""),
});
const appointmentStatusSchema = z.enum(["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED"]);
const appointmentStatusUpdateSchema = z.object({ id: z.string().uuid(), status: appointmentStatusSchema });

const allowedTransitions: Record<string, readonly string[]> = {
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "NO_SHOW", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "NO_SHOW", "CANCELLED"],
  CHECKED_IN: ["IN_PROGRESS", "NO_SHOW", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
};

export const dynamic = "force-dynamic";

function dateBounds(value: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const start = new Date(`${value}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const { start, end } = dateBounds(request.nextUrl.searchParams.get("date"));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, operational_note, price_cents, patient_id, service_id, patients(display_name), services(name, duration_minutes)")
    .eq("organization_id", context.organizationId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appointments = (data ?? []).map((appointment) => {
    const patient = Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients;
    const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
    return {
      id: appointment.id,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      status: appointment.status,
      operationalNote: appointment.operational_note,
      priceCents: appointment.price_cents,
      patientId: appointment.patient_id,
      patientName: patient?.display_name ?? "Paciente sem nome",
      serviceId: appointment.service_id,
      serviceName: service?.name ?? "Consulta",
      durationMinutes: service?.duration_minutes ?? 30,
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
  const startsAt = new Date(values.startsAt);
  const endsAt = new Date(values.endsAt);
  if (endsAt <= startsAt) return NextResponse.json({ error: "INVALID_TIME_RANGE" }, { status: 400 });

  const supabase = await createClient();
  const [{ data: patient }, { data: service }] = await Promise.all([
    supabase.from("patients").select("id").eq("id", values.patientId).eq("organization_id", context.organizationId).eq("active", true).maybeSingle(),
    supabase.from("services").select("id, price_cents").eq("id", values.serviceId).eq("organization_id", context.organizationId).eq("active", true).maybeSingle(),
  ]);

  if (!patient) return NextResponse.json({ error: "PATIENT_NOT_FOUND" }, { status: 400 });
  if (!service) return NextResponse.json({ error: "SERVICE_NOT_FOUND" }, { status: 400 });

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      organization_id: context.organizationId,
      patient_id: values.patientId,
      service_id: values.serviceId,
      professional_id: context.userId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      operational_note: values.operationalNote || null,
      price_cents: service.price_cents,
    })
    .select("id, starts_at, ends_at, status, operational_note, price_cents, patient_id, service_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("appointment_status_events").insert({
    organization_id: context.organizationId,
    appointment_id: data.id,
    from_status: null,
    to_status: "SCHEDULED",
    actor_user_id: context.userId,
  });
  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_user_id: context.userId,
    action: "APPOINTMENT_CREATED",
    resource_type: "APPOINTMENT",
    resource_id: data.id,
  });

  return NextResponse.json({ appointment: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const parsed = appointmentStatusUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_APPOINTMENT_STATUS", details: parsed.error.flatten() }, { status: 400 });

  const { id, status: nextStatus } = parsed.data;
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("appointments")
    .select("id, status, version")
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: "APPOINTMENT_NOT_FOUND" }, { status: 404 });
  if (current.status === nextStatus) return NextResponse.json({ error: "APPOINTMENT_STATUS_UNCHANGED" }, { status: 400 });
  if (!allowedTransitions[current.status]?.includes(nextStatus)) return NextResponse.json({ error: "INVALID_STATUS_TRANSITION" }, { status: 409 });

  const { data, error } = await supabase
    .from("appointments")
    .update({ status: nextStatus, version: current.version + 1 })
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .eq("status", current.status)
    .select("id, starts_at, ends_at, status, operational_note, price_cents, patient_id, service_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "APPOINTMENT_CONFLICT" }, { status: 409 });

  await supabase.from("appointment_status_events").insert({
    organization_id: context.organizationId,
    appointment_id: data.id,
    from_status: current.status,
    to_status: nextStatus,
    actor_user_id: context.userId,
  });
  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_user_id: context.userId,
    action: "APPOINTMENT_STATUS_UPDATED",
    resource_type: "APPOINTMENT",
    resource_id: data.id,
    metadata: { from: current.status, to: nextStatus },
  });

  return NextResponse.json({ appointment: data });
}
