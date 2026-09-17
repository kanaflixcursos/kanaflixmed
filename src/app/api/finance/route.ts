import { NextResponse } from "next/server";
import { getDashboardContext } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const financeRoles = new Set(["ADMIN", "RECEPTION", "FINANCE"]);

export async function GET() {
  const context = await getDashboardContext();
  if (!context) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!financeRoles.has(context.role)) return NextResponse.json({ error: "FINANCE_FORBIDDEN" }, { status: 403 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_entries")
    .select("id, appointment_id, patient_id, type, status, description, amount_cents, due_date, created_at, patients(display_name), appointments(starts_at), payments(amount_cents, reversed_payment_id)")
    .eq("organization_id", context.organizationId)
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = (data ?? []).map((entry) => {
    const patient = Array.isArray(entry.patients) ? entry.patients[0] : entry.patients;
    const appointment = Array.isArray(entry.appointments) ? entry.appointments[0] : entry.appointments;
    const payments = Array.isArray(entry.payments) ? entry.payments : [];
    const paidCents = payments.reduce((sum, payment) => sum + (payment.reversed_payment_id ? 0 : payment.amount_cents), 0);
    return {
      id: entry.id,
      appointmentId: entry.appointment_id,
      patientId: entry.patient_id,
      patientName: patient?.display_name ?? "Paciente sem nome",
      appointmentStartsAt: appointment?.starts_at ?? null,
      type: entry.type,
      status: entry.status,
      description: entry.description,
      amountCents: entry.amount_cents,
      paidCents,
      remainingCents: Math.max(entry.amount_cents - paidCents, 0),
      dueDate: entry.due_date,
      createdAt: entry.created_at,
    };
  });

  const totals = entries.reduce((summary, entry) => {
    if (entry.status === "PAID") summary.paidCents += entry.amountCents;
    if (entry.status === "PENDING" || entry.status === "PARTIAL" || entry.status === "OVERDUE") summary.openCents += entry.remainingCents;
    if (entry.status === "OVERDUE") summary.overdueCents += entry.remainingCents;
    return summary;
  }, { paidCents: 0, openCents: 0, overdueCents: 0 });

  return NextResponse.json({ entries, totals });
}
