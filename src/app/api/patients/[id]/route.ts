import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "INVALID_PATIENT" }, { status: 400 });

  const supabase = await createClient();
  const [{ data: patient, error: patientError }, { data: appointments, error: appointmentsError }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, record_number, display_name, legal_name, birth_date, phone_e164, email, notes, active, created_at, updated_at")
      .eq("id", id)
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, operational_note, price_cents, services(name)")
      .eq("patient_id", id)
      .eq("organization_id", context.organizationId)
      .order("starts_at", { ascending: false })
      .limit(30),
  ]);

  if (patientError) return NextResponse.json({ error: patientError.message }, { status: 500 });
  if (!patient) return NextResponse.json({ error: "PATIENT_NOT_FOUND" }, { status: 404 });
  if (appointmentsError) return NextResponse.json({ error: appointmentsError.message }, { status: 500 });

  return NextResponse.json({
    patient,
    appointments: (appointments ?? []).map((appointment) => {
      const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
      return {
        id: appointment.id,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
        status: appointment.status,
        operationalNote: appointment.operational_note,
        priceCents: appointment.price_cents,
        serviceName: service?.name ?? "Consulta",
      };
    }),
  });
}
