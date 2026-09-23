import { NewAppointmentForm } from "@/components/new-appointment-form";
import { getDashboardContext } from "@/lib/data/dashboard";
import { clinicToday } from "@/lib/date-time";

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ data?: string; hora?: string; returnTo?: string; patientId?: string }> }) {
  const [params, context] = await Promise.all([searchParams, getDashboardContext()]);
  const date = params.data && /^\d{4}-\d{2}-\d{2}$/.test(params.data) ? params.data : clinicToday(context?.timezone ?? "America/Sao_Paulo");
  const time = params.hora && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(params.hora) ? params.hora : "09:00";
  const returnTo = params.returnTo?.startsWith("/agenda") && !params.returnTo.startsWith("//") ? params.returnTo : "/agenda";
  const patientId = params.patientId && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(params.patientId) ? params.patientId : "";
  return <NewAppointmentForm initialDate={date} initialTime={time} returnTo={returnTo} initialPatientId={patientId} />;
}
