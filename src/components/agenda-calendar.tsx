"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, RefreshCw } from "lucide-react";

type View = "day" | "week" | "month";
type Appointment = { id: string; startsAt: string; endsAt: string; status: string; patientId: string; patientName: string; serviceName: string; professionalId: string; professionalName: string; version: number };
const statusText: Record<string, string> = { SCHEDULED: "Pré-agendada", CONFIRMED: "Confirmada", CHECKED_IN: "Em espera", IN_PROGRESS: "Em atendimento", COMPLETED: "Concluída", NO_SHOW: "Não compareceu", CANCELLED: "Cancelada" };

function toDate(value: string) { return new Date(`${value}T12:00:00Z`); }
function dateValue(value: Date) { return value.toISOString().slice(0, 10); }
function addDays(value: string, days: number) { const date = toDate(value); date.setUTCDate(date.getUTCDate() + days); return dateValue(date); }
function weekStart(value: string) { const date = toDate(value); const mondayOffset = (date.getUTCDay() + 6) % 7; date.setUTCDate(date.getUTCDate() - mondayOffset); return dateValue(date); }
function monthStart(value: string) { return `${value.slice(0, 7)}-01`; }
function timeOf(value: string, timezone: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone }).format(new Date(value)); }
function dateTitle(value: string, _timezone: string, options: Intl.DateTimeFormatOptions) { return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)); }
function dayNames(start: string, timezone: string) { return Array.from({ length: 7 }, (_, index) => { const date = addDays(start, index); return { date, label: dateTitle(date, timezone, { weekday: "short", day: "numeric" }) }; }); }

const statusClass: Record<string, string> = {
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-800",
  CONFIRMED: "border-blue-200 bg-blue-50 text-blue-900",
  CHECKED_IN: "border-amber-200 bg-amber-50 text-amber-900",
  IN_PROGRESS: "border-orange-200 bg-orange-50 text-orange-900",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-900",
  NO_SHOW: "border-rose-200 bg-rose-50 text-rose-900",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
};

export function AgendaCalendar({ initialDate, initialView }: { initialDate?: string; initialView?: View }) {
  const [view, setView] = useState<View>(initialView ?? "week");
  const [selectedDate, setSelectedDate] = useState(initialDate ?? new Intl.DateTimeFormat("en-CA").format(new Date()));
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<{ id: string; name: string }[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    if (view === "day") return { start: selectedDate, end: addDays(selectedDate, 1) };
    if (view === "week") { const start = weekStart(selectedDate); return { start, end: addDays(start, 7) }; }
    const start = weekStart(monthStart(selectedDate));
    return { start, end: addDays(start, 42) };
  }, [selectedDate, view]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const clinicResponse = await fetch("/api/clinic", { cache: "no-store" });
      const clinicPayload = await clinicResponse.json();
      if (clinicResponse.ok && clinicPayload.clinic?.timezone) setTimezone(clinicPayload.clinic.timezone);
      const query = new URLSearchParams({ start: range.start, end: range.end });
      if (professionalId) query.set("professionalId", professionalId);
      const [response, teamResponse] = await Promise.all([
        fetch(`/api/appointments?${query}`, { cache: "no-store" }),
        fetch("/api/team", { cache: "no-store" }),
      ]);
      const [payload, teamPayload] = await Promise.all([response.json(), teamResponse.json()]);
      if (!response.ok) throw new Error("Não foi possível carregar o calendário.");
      setAppointments(payload.appointments ?? []);
      setProfessionals(teamPayload.members ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o calendário."); }
    finally { setLoading(false); }
  }, [professionalId, range]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    query.set("date", selectedDate); query.set("view", view);
    window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
  }, [selectedDate, view]);

  const visibleDays = view === "day" ? [{ date: selectedDate, label: dateTitle(selectedDate, timezone, { weekday: "short", day: "numeric" }) }] : dayNames(range.start, timezone);
  const monthDays = view === "month" ? visibleDays : [];
  const appointmentsByDay = useMemo(() => appointments.reduce<Record<string, Appointment[]>>((groups, appointment) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(appointment.startsAt));
    (groups[date] ??= []).push(appointment);
    return groups;
  }, {}), [appointments, timezone]);

  function move(direction: number) {
    if (view !== "month") { setSelectedDate(addDays(selectedDate, direction * (view === "day" ? 1 : 7))); return; }
    const month = toDate(selectedDate); month.setUTCDate(1); month.setUTCMonth(month.getUTCMonth() + direction); setSelectedDate(dateValue(month));
  }
  function title() {
    if (view === "day") return dateTitle(selectedDate, timezone, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (view === "month") return dateTitle(`${monthStart(selectedDate)}`, timezone, { month: "long", year: "numeric" });
    return `${dateTitle(range.start, timezone, { day: "numeric", month: "short" })} – ${dateTitle(addDays(range.end, -1), timezone, { day: "numeric", month: "short", year: "numeric" })}`;
  }

  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-10 lg:py-9"><div className="mx-auto max-w-[1500px]">
    <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-brand">Operação</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em]">Agenda</h1><p className="mt-2 text-sm text-muted-foreground">Calendário de consultas de toda a clínica.</p></div><Link href={`/agenda/novo?data=${selectedDate}&returnTo=${encodeURIComponent(`/agenda?date=${selectedDate}&view=${view}`)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"><Plus size={17} />Novo agendamento</Link></header>
    <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl bg-background p-1">{(["day", "week", "month"] as View[]).map((item) => <button key={item} aria-pressed={view === item} onClick={() => setView(item)} className={`rounded-lg px-3 py-2 text-sm ${view === item ? "bg-brand text-white" : "text-muted-foreground hover:bg-surface-muted"}`}>{item === "day" ? "Dia" : item === "week" ? "Semana" : "Mês"}</button>)}</div><select aria-label="Filtrar profissional" value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-sm"><option value="">Todos os profissionais</option>{professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</select></div><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><button aria-label="Período anterior" onClick={() => move(-1)} className="grid size-9 place-items-center rounded-xl border border-border hover:border-brand hover:text-brand"><ArrowLeft size={16} /></button><button aria-label="Próximo período" onClick={() => move(1)} className="grid size-9 place-items-center rounded-xl border border-border hover:border-brand hover:text-brand"><ArrowRight size={16} /></button><button onClick={() => { setSelectedDate(new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date())); }} className="h-9 rounded-xl border border-border px-3 text-sm hover:border-brand">Hoje</button></div><strong className="min-w-36 text-right text-sm capitalize">{title()}</strong><button aria-label="Atualizar agenda" onClick={() => void load()} className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-background"><RefreshCw size={16} /></button></div></section>
    <div className="mt-4 flex flex-wrap gap-2">{Object.entries(statusText).slice(0, 5).map(([status, label]) => <span key={status} className={`rounded-full border px-2.5 py-1 text-xs ${statusClass[status]}`}>{label}</span>)}</div>
    {error ? <div role="alert" className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div> : null}
    {view === "month" ? <section className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"><div className="grid grid-cols-7 border-b border-border bg-background text-center text-xs font-medium capitalize text-muted-foreground">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <div key={day} className="py-3">{day}</div>)}</div><div className="grid grid-cols-7">{monthDays.map(({ date, label }) => { const belongs = date.slice(0, 7) === selectedDate.slice(0, 7); return <button key={date} onClick={() => { setSelectedDate(date); setView("day"); }} className={`min-h-28 border-b border-r border-border p-2 text-left sm:min-h-36 ${belongs ? "bg-surface" : "bg-background/70"}`}><span className={`text-xs ${belongs ? "text-foreground" : "text-muted-foreground"}`}>{label.split(" ").at(-1)}</span><span className="mt-2 block space-y-1">{(appointmentsByDay[date] ?? []).slice(0, 3).map((appointment) => <span key={appointment.id} className={`block truncate rounded-md border px-1.5 py-1 text-[10px] ${statusClass[appointment.status]}`}><b>{timeOf(appointment.startsAt, timezone)}</b> {appointment.patientName}</span>)}{(appointmentsByDay[date]?.length ?? 0) > 3 ? <span className="block text-[10px] text-muted-foreground">+{appointmentsByDay[date].length - 3} consultas</span> : null}</span></button>; })}</div>{loading ? <p className="p-3 text-center text-xs text-muted-foreground">Atualizando…</p> : null}</section> : <section className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"><div className="grid" style={{ gridTemplateColumns: `64px repeat(${visibleDays.length}, minmax(150px, 1fr))` }}><div className="sticky left-0 z-10 border-b border-r border-border bg-background p-3 text-xs text-muted-foreground">Horário</div>{visibleDays.map((day) => <div key={day.date} className={`border-b border-r border-border bg-background px-3 py-3 text-sm font-medium capitalize ${day.date === selectedDate ? "text-brand" : ""}`}><button onClick={() => { setSelectedDate(day.date); if (view !== "day") setView("day"); }}>{day.label}</button></div>)}{Array.from({ length: 24 }, (_, index) => <div key={`hour-${index}`} className="contents"><div className="sticky left-0 z-10 h-16 border-b border-r border-border bg-surface px-2 pt-2 text-right text-[11px] tabular-nums text-muted-foreground">{String(index).padStart(2, "0")}:00</div>{visibleDays.map((day) => <div key={`${day.date}-${index}`} className="relative h-16 border-b border-r border-border bg-white"><Link aria-label={`Criar consulta em ${day.date} às ${String(index).padStart(2, "0")}:00`} className="absolute inset-0 hover:bg-brand-soft/40" href={`/agenda/novo?data=${day.date}&hora=${String(index).padStart(2, "0")}:00&returnTo=${encodeURIComponent(`/agenda?date=${selectedDate}&view=${view}`)}`} />{(appointmentsByDay[day.date] ?? []).filter((appointment) => Number(timeOf(appointment.startsAt, timezone).slice(0, 2)) === index).map((appointment) => <Link key={appointment.id} href={`/agenda/${appointment.id}?returnTo=${encodeURIComponent(`/agenda?date=${selectedDate}&view=${view}`)}`} className={`absolute inset-x-1 top-1 z-[2] min-h-14 overflow-hidden rounded-xl border p-1.5 text-[10px] leading-4 shadow-sm ${statusClass[appointment.status]}`}><b className="block">{timeOf(appointment.startsAt, timezone)} · {appointment.patientName}</b><span className="block truncate">{appointment.serviceName}</span></Link>)}</div>)}</div>)}</div>{loading ? <p className="p-3 text-center text-xs text-muted-foreground">Atualizando…</p> : appointments.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">Nenhuma consulta neste período.</p> : null}</section>}
    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 size={14} />A consulta concluída e o prontuário encerrado são etapas diferentes.</div>
  </div></main>;
}
