import { AgendaCalendar } from "@/components/agenda-calendar";
import { getDashboardContext } from "@/lib/data/dashboard";
import { clinicToday } from "@/lib/date-time";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  const params = await searchParams;
  const context = await getDashboardContext();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : clinicToday(context?.timezone ?? "America/Sao_Paulo");
  const view = ["day", "week", "month"].includes(params.view ?? "") ? params.view as "day" | "week" | "month" : undefined;
  return <AgendaCalendar initialDate={date} initialView={view} />;
}
