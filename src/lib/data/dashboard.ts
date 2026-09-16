import { createClient } from "@/lib/supabase/server";

export type DashboardContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  role: string;
};

export type DashboardAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  notes: string | null;
  patientName: string;
  providerName: string | null;
};

/** Returns the first active organization available to the signed-in user. */
export async function getDashboardContext(): Promise<DashboardContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })
    .maybeSingle();

  if (!membership) return null;

  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;

  return {
    userId: user.id,
    organizationId: membership.organization_id,
    organizationName: organization?.name ?? "Clínica sem nome",
    role: membership.role,
  };
}

/** Fetches today's appointments while relying on the database RLS policies. */
export async function getTodayAppointments(date = new Date()): Promise<DashboardAppointment[]> {
  const context = await getDashboardContext();
  if (!context) return [];

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, operational_note, professional_id, patients(display_name), services(name)")
    .eq("organization_id", context.organizationId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`Não foi possível carregar a agenda: ${error.message}`);

  return (data ?? []).map((appointment) => {
    const patient = Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients;
    const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;

    return {
      id: appointment.id,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      status: appointment.status,
      type: service?.name ?? "Consulta",
      notes: appointment.operational_note,
      patientName: patient?.display_name ?? "Paciente sem nome",
      providerName: null,
    };
  });
}
