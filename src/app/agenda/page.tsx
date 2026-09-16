"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, FileText, Plus, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Appointment = { id: string; startsAt: string; endsAt: string; status: string; operationalNote: string | null; patientId: string; patientName: string; serviceId: string; serviceName: string; durationMinutes: number };
type Patient = { id: string; display_name: string };
type Service = { id: string; name: string; duration_minutes: number; price_cents: number };
type AppointmentForm = { patientId: string; serviceId: string; startsAt: string; notes: string };

const emptyForm: AppointmentForm = { patientId: "", serviceId: "", startsAt: "", notes: "" };

function localDateValue() { const date = new Date(); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); }
function time(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function dayLabel(value: string) { return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`)); }
function statusLabel(status: string) { return ({ SCHEDULED: "Agendado", CONFIRMED: "Confirmado", CHECKED_IN: "Em espera", IN_PROGRESS: "Em atendimento", COMPLETED: "Concluído", NO_SHOW: "Faltou", CANCELLED: "Cancelado" } as Record<string, string>)[status] ?? status; }

export default function AgendaPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(localDateValue);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<AppointmentForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (date = selectedDate) => {
    setIsLoading(true); setError(null);
    try {
      const [agendaResponse, patientsResponse, servicesResponse] = await Promise.all([
        fetch(`/api/appointments?date=${date}`, { cache: "no-store" }),
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
      ]);
      const agenda = await agendaResponse.json();
      const patientsPayload = await patientsResponse.json();
      const servicesPayload = await servicesResponse.json();
      if (!agendaResponse.ok || !patientsResponse.ok || !servicesResponse.ok) throw new Error("Entre na sua conta para acessar a agenda.");
      setAppointments(agenda.appointments ?? []); setPatients(patientsPayload.patients ?? []); setServices(servicesPayload.services ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a agenda."); }
    finally { setIsLoading(false); }
  }, [selectedDate]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadData(); }, 0); return () => window.clearTimeout(timer); }, [loadData]);

  const grouped = useMemo(() => appointments.reduce<Record<string, Appointment[]>>((groups, appointment) => { const key = time(appointment.startsAt); (groups[key] ??= []).push(appointment); return groups; }, {}), [appointments]);

  function openModal() { setError(null); setForm({ ...emptyForm, serviceId: services[0]?.id ?? "" }); setIsModalOpen(true); }
  function endFromStart(startValue: string, durationMinutes: number) { const start = new Date(startValue); start.setMinutes(start.getMinutes() + durationMinutes); return start.toISOString(); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSaving(true); setError(null);
    const service = services.find((item) => item.id === form.serviceId);
    if (!service || !form.patientId || !form.startsAt) { setError("Selecione paciente, serviço e horário."); setIsSaving(false); return; }
    try {
      const response = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: form.patientId, serviceId: form.serviceId, startsAt: new Date(form.startsAt).toISOString(), endsAt: endFromStart(form.startsAt, service.duration_minutes), operationalNote: form.notes }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "AUTH_REQUIRED" ? "Entre na sua conta antes de agendar." : "Revise os dados do agendamento.");
      setForm(emptyForm); setIsModalOpen(false); await loadData();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o agendamento."); }
    finally { setIsSaving(false); }
  }

  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-7xl"><button className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground" onClick={() => router.push("/")}><ArrowLeft size={16} />Voltar para visão geral</button><header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-brand">Operação</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">Agenda</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Organize horários, pacientes e próximos atendimentos.</p></div><button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-hover" onClick={openModal}><Plus size={18} />Novo agendamento</button></header>
    <section className="mt-8 flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-sm text-muted-foreground">Visualizando</p><h2 className="mt-1 text-lg font-medium capitalize">{dayLabel(selectedDate)}</h2></div><label className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm"><CalendarDays size={16} className="text-muted-foreground" /><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label></section>
    {error ? <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div> : null}
    <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"><div className="border-b border-border p-5 sm:p-6"><h2 className="text-lg font-medium">Atendimentos do dia</h2><p className="mt-1 text-sm text-muted-foreground">{appointments.length} agendamento{appointments.length === 1 ? "" : "s"}</p></div>{isLoading ? <div className="p-12 text-center text-sm text-muted-foreground">Carregando agenda...</div> : appointments.length === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Clock3 size={24} /></span><h3 className="mt-5 text-lg font-medium">Nenhum atendimento neste dia</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Escolha outro dia ou crie o primeiro agendamento.</p><button className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover" onClick={openModal}><Plus size={16} />Adicionar horário</button></div> : <div className="divide-y divide-border">{Object.entries(grouped).map(([slot, slotAppointments]) => <div className="flex gap-4 px-5 py-5 sm:px-6" key={slot}><div className="w-14 shrink-0 pt-1 text-sm font-medium tabular-nums">{slot}</div><div className="min-w-0 flex-1 space-y-3">{slotAppointments.map((appointment) => <article key={appointment.id} className="rounded-2xl border border-border bg-background p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><UserRound size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{appointment.patientName}</p><p className="mt-1 text-xs text-muted-foreground">{appointment.serviceName} · {appointment.durationMinutes} min</p></div><span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium">{statusLabel(appointment.status)}</span></div>{appointment.operationalNote ? <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground"><FileText size={14} className="mt-0.5 shrink-0" />{appointment.operationalNote}</p> : null}</article>)}</div></div>)}</div>}</section></div>
    {isModalOpen ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsModalOpen(false); }}><section aria-label="Novo agendamento" className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-8"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-brand">Agenda</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Novo agendamento</h2></div><button aria-label="Fechar agendamento" className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-surface-muted" onClick={() => setIsModalOpen(false)}><X size={18} /></button></div><form className="mt-7 space-y-4" onSubmit={handleSubmit}><label className="block"><span className="mb-2 block text-sm font-medium">Paciente</span><select className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand" value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} required><option value="">Selecione um paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.display_name}</option>)}</select></label><label className="block"><span className="mb-2 block text-sm font-medium">Serviço</span><select className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand" value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })} required><option value="">Selecione um serviço</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min</option>)}</select></label><label className="block"><span className="mb-2 block text-sm font-medium">Data e horário</span><input className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-brand" type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></label><label className="block"><span className="mb-2 block text-sm font-medium">Observação operacional</span><textarea className="min-h-24 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand" placeholder="Ex.: confirmar documentos na recepção" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end"><button className="h-11 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-surface-muted" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</button><button className="h-11 rounded-xl bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60" disabled={isSaving || patients.length === 0 || services.length === 0} type="submit">{isSaving ? "Salvando..." : "Salvar agendamento"}</button></div></form></section></div> : null}</main>;
}
