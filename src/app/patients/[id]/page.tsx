"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Mail, Phone, UserRound, FileCheck2, RefreshCw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const groupedHistory = historicalAppointments.reduce<Record<string, Appointment[]>>((groups, item) => {
    const key = monthLabel(item.startsAt, timezone);
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
          <Link className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium transition hover:border-brand hover:text-brand" href="/patients">Editar na lista</Link>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-medium">Dados do paciente</h2>
            <dl className="mt-6 space-y-5 text-sm">
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nome completo</dt><dd className="mt-1">{patient.legal_name || "Não informado"}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nascimento</dt><dd className="mt-1 inline-flex items-center gap-2"><CalendarDays size={15} className="text-muted-foreground" />{formatDate(patient.birth_date)}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Telefone</dt><dd className="mt-1 inline-flex items-center gap-2"><Phone size={15} className="text-muted-foreground" />{patient.phone_e164 || "Não informado"}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">E-mail</dt><dd className="mt-1 inline-flex items-center gap-2"><Mail size={15} className="text-muted-foreground" />{patient.email || "Não informado"}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Observações administrativas</dt><dd className="mt-1 whitespace-pre-wrap leading-6">{patient.notes || "Nenhuma observação registrada."}</dd></div>
            </dl>
          </article>

          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-medium">Consultas do paciente</h2><p className="mt-1 text-sm text-muted-foreground">Próximas consultas e histórico em ordem cronológica.</p></div><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">{appointments.length} registro{appointments.length === 1 ? "" : "s"}</span></div>
            {appointments.length === 0 ? <div className="mt-10 flex flex-col items-center px-4 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted-foreground"><Clock3 size={20} /></span><p className="mt-4 text-sm font-medium">Nenhuma consulta registrada</p><p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">As consultas deste paciente aparecerão aqui.</p></div> : <>
              {upcomingAppointments.length ? <section className="mt-6"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand">Próximas consultas</h3><div className="space-y-3">{upcomingAppointments.map((appointment) => <Link href={`/agenda/${appointment.id}?returnTo=${encodeURIComponent(`/patients/${patient.id}`)}`} key={appointment.id} className="block rounded-2xl border border-brand/15 bg-brand-soft/40 p-4 hover:border-brand/40"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{appointment.serviceName}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(appointment.startsAt, timezone)} · {appointment.professionalName}</p></div><span className="text-xs font-medium text-brand">{appointmentStatus[appointment.status]}</span></div></Link>)}</div></section> : null}
              <section className="mt-7"><h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico</h3>{Object.entries(groupedHistory).map(([month, items]) => <div key={month} className="mb-6 last:mb-0"><h4 className="mb-3 text-sm font-medium capitalize">{month}</h4><div className="relative ml-3 border-l border-border pl-5">{items.map((appointment) => <Link href={`/agenda/${appointment.id}?returnTo=${encodeURIComponent(`/patients/${patient.id}`)}`} key={appointment.id} className="relative mb-4 block rounded-2xl border border-border bg-background p-4 last:mb-0 hover:border-brand/50"><span className="absolute -left-[26px] top-5 size-2.5 rounded-full border-2 border-surface bg-brand" /><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium">{appointment.serviceName}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(appointment.startsAt, timezone)} · {appointment.professionalName}</p></div><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] text-muted-foreground">{appointmentStatus[appointment.status] ?? appointment.status}</span></div>{appointment.encounterStatus === "FINALIZED" ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-success"><FileCheck2 size={14} />Prontuário encerrado</p> : null}{appointment.reschedules.length ? <div className="mt-3 border-t border-border pt-3 text-xs text-warning"><span className="inline-flex items-center gap-1.5 font-medium"><RefreshCw size={13} />{appointment.reschedules.length} remarcação(ões)</span>{appointment.reschedules.map((reschedule) => <p key={reschedule.id} className="mt-1 text-muted-foreground">{formatDateTime(reschedule.previous_starts_at, timezone)} → {formatDateTime(reschedule.starts_at, timezone)}</p>)}</div> : null}{appointment.events.length > 1 ? <ol className="mt-3 space-y-1 border-t border-border pt-3">{appointment.events.map((item, index) => <li key={`${item.occurred_at}-${index}`} className="text-xs text-muted-foreground">{appointmentStatus[item.to_status] ?? item.to_status} · {formatDateTime(item.occurred_at, timezone)}{item.reason ? ` · ${item.reason}` : ""}</li>)}</ol> : null}{appointment.operationalNote ? <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">{appointment.operationalNote}</p> : null}</Link>)}</div></div>)}</section>
              {hasMore ? <button onClick={() => void loadMore()} disabled={loadingMore} className="mt-5 h-10 w-full rounded-xl border border-border text-sm font-medium hover:border-brand hover:text-brand disabled:opacity-60">{loadingMore ? "Carregando…" : "Carregar consultas anteriores"}</button> : null}
            </>}
          </article>
        </section>
      </div>
    </main>
  );
}
