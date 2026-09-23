"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, CheckCircle2, Clock3, FileClock, FileText, RefreshCw, UserRound } from "lucide-react";

type Data = {
  appointment: { id: string; patientId: string; patientName: string; recordNumber: number | null; serviceName: string; durationMinutes: number; professionalId: string; professionalName: string; startsAt: string; endsAt: string; status: string; operationalNote: string | null; priceCents: number; version: number };
  events: { from_status: string | null; to_status: string; reason: string | null; occurred_at: string }[];
  reschedules: { previous_starts_at: string; starts_at: string; reason: string | null; occurred_at: string }[];
  encounter: { status: string; version: number; professionalId: string } | null;
  permissions: { canWriteEncounter: boolean; isAdmin: boolean };
  timezone: string;
};

const labels: Record<string, string> = { SCHEDULED: "Pré-agendada", CONFIRMED: "Confirmada", CHECKED_IN: "Em espera", IN_PROGRESS: "Em atendimento", COMPLETED: "Consulta concluída", NO_SHOW: "Não compareceu", CANCELLED: "Cancelada" };
const dateTime = (value: string, timezone: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: timezone }).format(new Date(value));
const localDate = (value: string, timezone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const localTime = (value: string, timezone: string) => new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function AppointmentDetail({ id, returnTo }: { id: string; returnTo: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/appointments/${id}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "APPOINTMENT_NOT_FOUND" ? "Consulta não encontrada." : "Não foi possível carregar a consulta.");
      setData(payload);
      setNewDate(localDate(payload.appointment.startsAt, payload.timezone));
      setNewTime(localTime(payload.appointment.startsAt, payload.timezone));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a consulta."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function updateStatus(nextStatus: string) {
    if (!data) return;
    let statusReason = "";
    if (nextStatus === "CANCELLED" || nextStatus === "NO_SHOW") {
      statusReason = window.prompt(nextStatus === "CANCELLED" ? "Informe o motivo do cancelamento" : "Informe o motivo da falta", "")?.trim() ?? "";
      if (statusReason.length < 2) { setError("Informe um motivo para continuar."); return; }
    }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: nextStatus, version: data.appointment.version, reason: statusReason }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "APPOINTMENT_CONFLICT" ? "A consulta mudou em outra sessão. Atualize os dados." : "Não foi possível atualizar o status.");
      await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Não foi possível atualizar o status."); }
    finally { setSaving(false); }
  }

  async function reschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!data) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ localDate: newDate, localTime: newTime, version: data.appointment.version, reason }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "APPOINTMENT_CONFLICT" ? "O horário já está ocupado ou foi atualizado em outra sessão." : "Não foi possível remarcar a consulta.");
      setReason(""); await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Não foi possível remarcar a consulta."); }
    finally { setSaving(false); }
  }

  if (loading && !data) return <main className="min-h-screen bg-background px-5 py-8"><div className="mx-auto max-w-4xl text-sm text-muted-foreground">Carregando consulta…</div></main>;
  if (!data) return <main className="min-h-screen bg-background px-5 py-8"><div className="mx-auto max-w-4xl"><Link href={returnTo} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} />Voltar</Link><p role="alert" className="mt-5 rounded-xl bg-danger/5 p-4 text-sm text-danger">{error || "Consulta não encontrada."}</p></div></main>;

  const { appointment } = data;
  const nextAction: Record<string, { status: string; label: string; icon: typeof Check }> = {
    SCHEDULED: { status: "CONFIRMED", label: "Confirmar consulta", icon: Check },
    CONFIRMED: { status: "CHECKED_IN", label: "Fazer check-in", icon: CheckCircle2 },
    CHECKED_IN: { status: "IN_PROGRESS", label: "Iniciar atendimento", icon: Clock3 },
    IN_PROGRESS: { status: "COMPLETED", label: "Concluir consulta", icon: CheckCircle2 },
  };
  const action = nextAction[appointment.status];
  const cancellable = ["SCHEDULED", "CONFIRMED", "CHECKED_IN"].includes(appointment.status);
  const canReschedule = ["SCHEDULED", "CONFIRMED"].includes(appointment.status);
  const encounterActionLabel = appointment.status !== "COMPLETED" ? null
    : data.permissions.canWriteEncounter ? data.encounter?.status === "FINALIZED" ? "Ver prontuário encerrado" : data.encounter ? "Continuar prontuário" : "Abrir prontuário"
    : data.encounter?.status === "FINALIZED" && data.permissions.isAdmin ? "Ver prontuário encerrado" : null;

  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-10"><div className="mx-auto max-w-5xl">
    <Link href={returnTo} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"><ArrowLeft size={16} />Voltar para agenda</Link>
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-brand">Detalhe da consulta</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em]">{appointment.patientName}</h1><p className="mt-2 text-sm text-muted-foreground">Prontuário #{appointment.recordNumber ?? "—"} · {appointment.serviceName}</p></div><span className="inline-flex w-fit rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium">{labels[appointment.status] ?? appointment.status}</span></header>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p> : null}
      <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><article className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><h2 className="text-lg font-medium">Dados do atendimento</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Data e horário</dt><dd className="mt-1 inline-flex items-center gap-2 text-sm"><CalendarDays size={15} className="text-brand" />{dateTime(appointment.startsAt, data.timezone)}</dd></div><div><dt className="text-xs text-muted-foreground">Duração</dt><dd className="mt-1 text-sm">{appointment.durationMinutes} minutos</dd></div><div><dt className="text-xs text-muted-foreground">Profissional</dt><dd className="mt-1 text-sm">{appointment.professionalName}</dd></div><div><dt className="text-xs text-muted-foreground">Serviço</dt><dd className="mt-1 text-sm">{appointment.serviceName}</dd></div></dl>{appointment.operationalNote ? <div className="mt-5 rounded-xl bg-background p-4"><p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"><FileText size={14} />Observação administrativa</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{appointment.operationalNote}</p></div> : null}<Link href={`/patients/${appointment.patientId}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand"><UserRound size={16} />Abrir cadastro do paciente</Link></article>
      <article className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><h2 className="text-lg font-medium">Ações da consulta</h2>{action ? <button disabled={saving} onClick={() => void updateStatus(action.status)} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"><action.icon size={16} />{action.label}</button> : null}{cancellable ? <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={saving} onClick={() => void updateStatus("NO_SHOW")} className="h-10 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground hover:border-warning hover:text-warning">Registrar falta</button><button disabled={saving} onClick={() => void updateStatus("CANCELLED")} className="h-10 rounded-xl border border-border px-3 text-xs font-medium text-danger hover:border-danger">Cancelar</button></div> : null}{canReschedule ? <form onSubmit={reschedule} className="mt-5 border-t border-border pt-5"><h3 className="text-sm font-medium">Remarcar consulta</h3><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs text-muted-foreground">Data<input required type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground" /></label><label className="text-xs text-muted-foreground">Horário<input required type="time" step={900} value={newTime} onChange={(event) => setNewTime(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground" /></label></div><label className="mt-3 block text-xs text-muted-foreground">Motivo (opcional)<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" /></label><button disabled={saving} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium hover:border-brand hover:text-brand disabled:opacity-50"><RefreshCw size={15} />Salvar novo horário</button></form> : null}{encounterActionLabel ? <Link href={`/agenda/${id}/prontuario`} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-success px-4 text-sm font-medium text-white hover:opacity-90"><FileClock size={16} />{encounterActionLabel}</Link> : null}<p className="mt-4 text-xs leading-5 text-muted-foreground">A consulta concluída e o prontuário encerrado são etapas diferentes.</p></article></section>
    <section className="mt-6 grid gap-5 lg:grid-cols-2"><article className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><h2 className="text-lg font-medium">Histórico de status</h2><ol className="mt-5 space-y-4">{data.events.map((event, index) => <li key={`${event.occurred_at}-${index}`} className="flex gap-3"><span className="mt-1 size-2.5 shrink-0 rounded-full bg-brand" /><span className="min-w-0 flex-1"><strong className="text-sm font-medium">{labels[event.to_status] ?? event.to_status}</strong><span className="mt-1 block text-xs text-muted-foreground">{dateTime(event.occurred_at, data.timezone)}{event.reason ? ` · ${event.reason}` : ""}</span></span></li>)}</ol></article><article className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><h2 className="text-lg font-medium">Remarcações</h2>{data.reschedules.length ? <ol className="mt-5 space-y-4">{data.reschedules.map((item, index) => <li key={`${item.occurred_at}-${index}`} className="flex gap-3"><span className="mt-1 size-2.5 shrink-0 rounded-full bg-warning" /><span><strong className="text-sm font-medium">{dateTime(item.previous_starts_at, data.timezone)} <span className="text-muted-foreground">→</span> {dateTime(item.starts_at, data.timezone)}</strong><span className="mt-1 block text-xs text-muted-foreground">Alterado em {dateTime(item.occurred_at, data.timezone)}{item.reason ? ` · ${item.reason}` : ""}</span></span></li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">Esta consulta ainda não foi remarcada.</p>}</article></section>
  </div></main>;
}
