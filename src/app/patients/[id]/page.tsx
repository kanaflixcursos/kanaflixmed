"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Mail, Phone, UserRound, FileCheck2, RefreshCw, MessageSquareText, Plus, Pencil } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Patient = {
  id: string;
  record_number: number;
  display_name: string;
  legal_name: string | null;
  birth_date: string | null;
  phone_e164: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isUpcoming: boolean;
  operationalNote: string | null;
  priceCents: number;
  serviceName: string;
  professionalName: string;
  encounterStatus: string | null;
  events: { from_status: string | null; to_status: string; reason: string | null; occurred_at: string }[];
  reschedules: { id: string; previous_starts_at: string; starts_at: string; reason: string | null; occurred_at: string }[];
};
type Observation = { id: string; body: string; author_name: string; created_at: string };
type TimelineItem = { kind: "appointment"; at: string; appointment: Appointment } | { kind: "observation"; at: string; observation: Observation };

const appointmentStatus: Record<string, string> = {
  SCHEDULED: "Pré-agendada",
  CONFIRMED: "Confirmado",
  CHECKED_IN: "Check-in",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
  CANCELLED: "Cancelado",
};

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

function monthLabel(value: string, timezone: string) { return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: timezone }).format(new Date(value)); }

export default function PatientDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [observationText, setObservationText] = useState("");
  const [observationError, setObservationError] = useState("");
  const [savingObservation, setSavingObservation] = useState(false);
  const [moreObservations, setMoreObservations] = useState(false);
  const [observationCursor, setObservationCursor] = useState<string | null>(null);
  const [loadingObservations, setLoadingObservations] = useState(false);

  useEffect(() => {
    async function loadPatient() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/patients/${params.id}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error === "AUTH_REQUIRED" ? "Entre na sua conta para acessar este paciente." : payload.error === "PATIENT_NOT_FOUND" ? "Paciente não encontrado." : "Não foi possível carregar o paciente.");
        }
        setPatient(payload.patient);
        setAppointments(payload.appointments ?? []);
        setTimezone(payload.timezone ?? "America/Sao_Paulo");
        setHasMore(payload.hasMore ?? false);
        setNextCursor(payload.nextCursor ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o paciente.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPatient();
  }, [params.id]);

  useEffect(() => {
    let active = true;
    async function loadObservations() {
      try {
        const response = await fetch(`/api/patients/${params.id}/observations`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error("Não foi possível carregar as observações.");
        if (active) { setObservations(payload.observations ?? []); setMoreObservations(payload.hasMore ?? false); setObservationCursor(payload.nextCursor ?? null); }
      } catch (loadError) { if (active) setObservationError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as observações."); }
    }
    void loadObservations();
    return () => { active = false; };
  }, [params.id]);

  async function addObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingObservation(true); setObservationError("");
    try {
      const response = await fetch(`/api/patients/${params.id}/observations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: observationText }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "PATIENT_NOT_FOUND" ? "Paciente não está mais ativo." : "Não foi possível salvar a observação.");
      setObservations((current) => [payload.observation, ...current]);
      setObservationText("");
    } catch (saveError) { setObservationError(saveError instanceof Error ? saveError.message : "Não foi possível salvar a observação."); }
    finally { setSavingObservation(false); }
  }

  async function loadMoreObservations() {
    if (!observationCursor || loadingObservations) return;
    setLoadingObservations(true); setObservationError("");
    try {
      const response = await fetch(`/api/patients/${params.id}/observations?before=${encodeURIComponent(observationCursor)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error("Não foi possível carregar mais observações.");
      setObservations((current) => [...current, ...(payload.observations ?? [])]);
      setMoreObservations(payload.hasMore ?? false);
      setObservationCursor(payload.nextCursor ?? null);
    } catch (loadError) { setObservationError(loadError instanceof Error ? loadError.message : "Não foi possível carregar mais observações."); }
    finally { setLoadingObservations(false); }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/patients/${params.id}?before=${encodeURIComponent(nextCursor)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error("Não foi possível carregar mais consultas.");
      setAppointments((current) => [...current, ...(payload.appointments ?? [])]);
      setHasMore(payload.hasMore ?? false);
      setNextCursor(payload.nextCursor ?? null);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar mais consultas."); }
    finally { setLoadingMore(false); }
  }

  const upcomingAppointments = appointments.filter((item) => item.isUpcoming);
  const historicalAppointments = appointments.filter((item) => !upcomingAppointments.includes(item));
  const historyItems: TimelineItem[] = [
    ...historicalAppointments.map((appointment) => ({ kind: "appointment" as const, at: appointment.startsAt, appointment })),
    ...observations.map((observation) => ({ kind: "observation" as const, at: observation.created_at, observation })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const groupedHistory = historyItems.reduce<Record<string, TimelineItem[]>>((groups, item) => {
    const key = monthLabel(item.at, timezone);
    (groups[key] ??= []).push(item);
    return groups;
  }, {});

  if (isLoading) return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-5xl text-sm text-muted-foreground">Carregando paciente...</div></main>;

  if (error || !patient) return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-5xl"><button className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground" onClick={() => router.push("/patients")}><ArrowLeft size={16} />Voltar para pacientes</button><div className="rounded-3xl border border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">{error ?? "Paciente não encontrado."}</div></div></main>;

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <Link className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground" href="/patients"><ArrowLeft size={16} />Voltar para pacientes</Link>

        <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><UserRound size={25} /></span>
            <div>
              <p className="text-sm font-medium text-brand">Prontuário #{patient.record_number}</p>
              <h1 className="mt-1 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">{patient.display_name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{patient.active ? "Cadastro ativo" : "Cadastro inativo"}</p>
            </div>
          </div>
          <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition hover:border-brand hover:text-brand" href={`/patients/${patient.id}/editar`}><Pencil size={15} />Editar paciente</Link>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-medium">Dados do paciente</h2>
            <dl className="mt-6 space-y-5 text-sm">
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nome completo</dt><dd className="mt-1">{patient.legal_name || "Não informado"}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nascimento</dt><dd className="mt-1 inline-flex items-center gap-2"><CalendarDays size={15} className="text-muted-foreground" />{formatDate(patient.birth_date)}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Telefone</dt><dd className="mt-1 inline-flex items-center gap-2"><Phone size={15} className="text-muted-foreground" />{patient.phone_e164 || "Não informado"}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">E-mail</dt><dd className="mt-1 inline-flex items-center gap-2"><Mail size={15} className="text-muted-foreground" />{patient.email || "Não informado"}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Informações administrativas do cadastro</dt><dd className="mt-1 whitespace-pre-wrap leading-6">{patient.notes || "Nenhuma informação registrada."}</dd></div>
            </dl>
          </article>

          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm"><h2 className="text-lg font-medium">Próximas consultas</h2><p className="mt-1 text-sm text-muted-foreground">Atendimentos futuros deste paciente.</p>{upcomingAppointments.length ? <div className="mt-5 space-y-3">{upcomingAppointments.map((appointment) => <Link href={`/agenda/${appointment.id}?returnTo=${encodeURIComponent(`/patients/${patient.id}`)}`} key={appointment.id} className="block rounded-2xl border border-brand/15 bg-brand-soft/40 p-4 hover:border-brand/40"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{appointment.serviceName}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(appointment.startsAt, timezone)} · {appointment.professionalName}</p></div><span className="text-xs font-medium text-brand">{appointmentStatus[appointment.status]}</span></div></Link>)}</div> : <p className="mt-6 text-sm text-muted-foreground">Nenhuma próxima consulta marcada.</p>}</article>
        </section>

          <section className="mt-5 rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-medium">Histórico do paciente</h2><p className="mt-1 text-sm text-muted-foreground">Consultas passadas e observações em ordem cronológica.</p></div><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">{historyItems.length} registro{historyItems.length === 1 ? "" : "s"}</span></div>
            {patient.active ? <form onSubmit={addObservation} className="mt-5 max-w-2xl rounded-2xl border border-border bg-background p-3"><label htmlFor="patient-observation" className="flex items-center gap-2 text-sm font-medium"><MessageSquareText size={16} className="text-brand" />Adicionar observação</label><p className="mt-1 text-xs text-muted-foreground">Registro administrativo com autor, data e horário. Não substitui o prontuário clínico.</p><textarea id="patient-observation" required maxLength={2000} value={observationText} onChange={(event) => setObservationText(event.target.value)} placeholder="Escreva uma observação sobre este paciente" className="mt-3 min-h-16 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm" /><div className="mt-2 flex justify-end"><button type="submit" disabled={savingObservation || !observationText.trim()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand px-3 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60"><Plus size={14} />{savingObservation ? "Salvando…" : "Registrar observação"}</button></div></form> : null}
            {observationError ? <p role="alert" className="mt-4 rounded-xl bg-danger/5 px-3 py-2 text-sm text-danger">{observationError}</p> : null}
            <section className="mt-7"><h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h3>
              {historyItems.length === 0 ? <div className="flex flex-col items-center px-4 py-8 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted-foreground"><Clock3 size={20} /></span><p className="mt-4 text-sm font-medium">Nenhum registro no histórico</p><p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">Consultas e observações aparecerão aqui.</p></div> : Object.entries(groupedHistory).map(([month, items]) => <div key={month} className="mb-6 last:mb-0"><h4 className="mb-3 text-sm font-medium capitalize">{month}</h4><div className="relative ml-3 border-l border-border pl-5">{items.map((item) => item.kind === "observation" ? <div key={`observation-${item.observation.id}`} className="relative mb-4 rounded-2xl border border-border bg-background p-4 last:mb-0"><span className="absolute -left-[26px] top-5 size-2.5 rounded-full border-2 border-surface bg-success" /><div className="flex flex-wrap items-start justify-between gap-2"><p className="inline-flex items-center gap-2 text-sm font-medium"><MessageSquareText size={15} className="text-success" />Observação</p><span className="text-xs text-muted-foreground">{formatDateTime(item.observation.created_at, timezone)}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.observation.body}</p><p className="mt-2 text-xs text-muted-foreground">Registrado por {item.observation.author_name}</p></div> : <Link href={`/agenda/${item.appointment.id}?returnTo=${encodeURIComponent(`/patients/${patient.id}`)}`} key={`appointment-${item.appointment.id}`} className="relative mb-4 block rounded-2xl border border-border bg-background p-4 last:mb-0 hover:border-brand/50"><span className="absolute -left-[26px] top-5 size-2.5 rounded-full border-2 border-surface bg-brand" /><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium">{item.appointment.serviceName}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.appointment.startsAt, timezone)} · {item.appointment.professionalName}</p></div><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] text-muted-foreground">{appointmentStatus[item.appointment.status] ?? item.appointment.status}</span></div>{item.appointment.encounterStatus === "FINALIZED" ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-success"><FileCheck2 size={14} />Prontuário encerrado</p> : null}{item.appointment.reschedules.length ? <div className="mt-3 border-t border-border pt-3 text-xs text-warning"><span className="inline-flex items-center gap-1.5 font-medium"><RefreshCw size={13} />{item.appointment.reschedules.length} remarcação(ões)</span>{item.appointment.reschedules.map((reschedule) => <p key={reschedule.id} className="mt-1 text-muted-foreground">{formatDateTime(reschedule.previous_starts_at, timezone)} → {formatDateTime(reschedule.starts_at, timezone)}</p>)}</div> : null}{item.appointment.events.length > 1 ? <ol className="mt-3 space-y-1 border-t border-border pt-3">{item.appointment.events.map((event, index) => <li key={`${event.occurred_at}-${index}`} className="text-xs text-muted-foreground">{appointmentStatus[event.to_status] ?? event.to_status} · {formatDateTime(event.occurred_at, timezone)}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol> : null}{item.appointment.operationalNote ? <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">{item.appointment.operationalNote}</p> : null}</Link>)}</div></div>)}
            </section>
            {hasMore ? <button onClick={() => void loadMore()} disabled={loadingMore} className="mt-5 h-10 w-full rounded-xl border border-border text-sm font-medium hover:border-brand hover:text-brand disabled:opacity-60">{loadingMore ? "Carregando…" : "Carregar consultas anteriores"}</button> : null}
            {moreObservations ? <button onClick={() => void loadMoreObservations()} disabled={loadingObservations} className="mt-3 h-10 w-full rounded-xl border border-border text-sm font-medium hover:border-brand hover:text-brand disabled:opacity-60">{loadingObservations ? "Carregando…" : "Carregar observações anteriores"}</button> : null}
          </section>
      </div>
    </main>
  );
}
