"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, FileClock, RefreshCw, Stethoscope, UserRound, WalletCards } from "lucide-react";

type Period = "day" | "week" | "month";
type Summary = { scheduled: number; confirmed: number; realized: number; finalized: number; pendingRecords: number; cancelled: number; rescheduled: number };
type Dashboard = {
  organizationName: string;
  timezone: string;
  period: Period;
  start: string;
  end: string;
  summary: Summary;
  comparison: Partial<Record<keyof Summary, { delta: number; percent: number | null }>>;
  upcoming: { id: string; startsAt: string; status: string; patientName: string; serviceName: string; professionalName: string }[];
  financial: null | { forecastScheduled: number; forecastConfirmed: number; forecastUnpriced: number; receivable: number; received: number };
  series: { label: string; realized: number; finalized: number; cancelled: number; rescheduled: number }[];
};

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const dateLabel = (value: string, _timezone: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const timeLabel = (value: string, timezone: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(value));
const statusLabel: Record<string, string> = { SCHEDULED: "Pré-agendada", CONFIRMED: "Confirmada", CHECKED_IN: "Em espera", IN_PROGRESS: "Em atendimento" };

function shiftAnchor(value: string, period: Period, direction: number) {
  const date = new Date(`${value}T12:00:00Z`);
  if (period === "day") date.setUTCDate(date.getUTCDate() + direction);
  if (period === "week") date.setUTCDate(date.getUTCDate() + 7 * direction);
  if (period === "month") date.setUTCMonth(date.getUTCMonth() + direction);
  return date.toISOString().slice(0, 10);
}

function StatCard({ title, value, hint, icon: Icon, tone = "blue", comparison }: { title: string; value: number; hint: string; icon: typeof CalendarDays; tone?: string; comparison?: { delta: number; percent: number | null } }) {
  return <article className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><span className={`grid size-11 place-items-center rounded-2xl ${tone === "green" ? "bg-success/10 text-success" : tone === "amber" ? "bg-warning/10 text-warning" : tone === "red" ? "bg-danger/10 text-danger" : "bg-brand-soft text-brand"}`}><Icon size={20} /></span><span className="text-xs text-muted-foreground">{hint}</span></div><p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">{value}</p><h2 className="mt-1 text-sm text-muted-foreground">{title}</h2>{comparison ? <p className={`mt-3 text-xs ${comparison.delta < 0 ? "text-warning" : "text-success"}`}>{comparison.delta > 0 ? "+" : ""}{comparison.delta} vs. período anterior{comparison.percent === null ? "" : ` · ${comparison.percent > 0 ? "+" : ""}${comparison.percent}%`}</p> : null}</article>;
}

function ActivityChart({ series }: { series: Dashboard["series"] }) {
  const max = Math.max(1, ...series.flatMap((item) => [item.realized, item.finalized, item.cancelled, item.rescheduled]));
  const columns = series.length;
  const width = Math.max(640, columns * 34);
  const colors = [{ key: "realized", label: "Consultas concluídas", color: "#1765DF" }, { key: "finalized", label: "Prontuários encerrados", color: "#087F74" }, { key: "cancelled", label: "Canceladas", color: "#BF2C2C" }, { key: "rescheduled", label: "Remarcadas", color: "#A76000" }] as const;
  return <div className="overflow-x-auto app-scrollbar"><div className="min-w-[640px]"><div className="mb-5 flex flex-wrap gap-x-5 gap-y-2">{colors.map((item) => <span key={item.key} className="inline-flex items-center gap-2 text-xs text-muted-foreground"><i className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}</div><svg role="img" aria-label="Gráfico de consultas concluídas, prontuários encerrados, cancelamentos e remarcações" viewBox={`0 0 ${width} 220`} className="h-56 w-full"><line x1="0" x2={width} y1="180" y2="180" stroke="#E0EAF5" />{series.map((point, index) => <g key={`${point.label}-${index}`} transform={`translate(${index * (width / columns)},0)`}><text x={width / columns / 2} y="205" textAnchor="middle" fontSize="10" fill="#60728C">{point.label}</text>{colors.map((item, colorIndex) => { const height = Math.max(point[item.key] ? 5 : 0, point[item.key] / max * 142); return <rect key={item.key} x={5 + colorIndex * 6} y={180 - height} width="5" height={height} rx="2.5" fill={item.color} />; })}</g>)}</svg></div></div>;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [anchor, setAnchor] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ period });
      if (anchor) query.set("anchor", anchor);
      const response = await fetch(`/api/dashboard?${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "AUTH_REQUIRED" ? "Entre na sua conta para abrir o dashboard." : "Não foi possível carregar os indicadores.");
      setData(payload);
      if (!anchor) setAnchor(payload.start);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o dashboard.");
    } finally { setLoading(false); }
  }, [period, anchor]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const periodTitle = useMemo(() => {
    if (!data) return "Resumo da clínica";
    const from = dateLabel(data.start, data.timezone, { day: "numeric", month: "short" });
    const to = dateLabel(shiftAnchor(data.end, "day", -1), data.timezone, { day: "numeric", month: "short", year: "numeric" });
    return period === "day" ? dateLabel(data.start, data.timezone, { weekday: "long", day: "numeric", month: "long" }) : `${from} – ${to}`;
  }, [data, period]);

  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-10"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-brand">Visão geral · clínica inteira</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">Bom dia</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Acompanhe consultas, prontuários e a rotina de {data?.organizationName ?? "sua clínica"}.</p></div><Link className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover" href="/agenda/novo"><CalendarDays size={17} />Novo agendamento</Link></header>

    <section className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-3 sm:px-4"><div className="flex flex-wrap gap-1 rounded-xl bg-background p-1">{(["day", "week", "month"] as Period[]).map((item) => <button key={item} aria-pressed={period === item} onClick={() => { setPeriod(item); setAnchor(""); }} className={`rounded-lg px-3 py-2 text-sm ${period === item ? "bg-brand text-white shadow-sm" : "text-muted-foreground hover:bg-surface-muted"}`}>{item === "day" ? "Dia" : item === "week" ? "Semana" : "Mês"}</button>)}</div><div className="flex items-center gap-2"><button aria-label="Período anterior" className="grid size-9 place-items-center rounded-xl border border-border hover:border-brand hover:text-brand" onClick={() => anchor && setAnchor(shiftAnchor(anchor, period, -1))}><ArrowLeft size={16} /></button><span className="min-w-36 text-center text-sm font-medium capitalize">{periodTitle}</span><button aria-label="Próximo período" className="grid size-9 place-items-center rounded-xl border border-border hover:border-brand hover:text-brand" onClick={() => anchor && setAnchor(shiftAnchor(anchor, period, 1))}><ArrowRight size={16} /></button><button aria-label="Atualizar dashboard" className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-background" onClick={() => void load()}><RefreshCw size={16} /></button></div></section>

    {error ? <div role="alert" className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div> : null}
    {loading && !data ? <div className="mt-8 rounded-3xl border border-border bg-surface p-12 text-center text-sm text-muted-foreground">Carregando os dados da clínica…</div> : data ? <>
      <section aria-label="Indicadores do período" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pré-agendadas" value={data.summary.scheduled} hint="no período" icon={CalendarDays} comparison={data.comparison.scheduled} />
        <StatCard title="Confirmadas" value={data.summary.confirmed} hint="no período" icon={CheckCircle2} comparison={data.comparison.confirmed} />
        <StatCard title="Consultas concluídas" value={data.summary.realized} hint="por data de conclusão" icon={Stethoscope} tone="green" comparison={data.comparison.realized} />
        <StatCard title="Prontuários encerrados" value={data.summary.finalized} hint="por data de encerramento" icon={FileClock} tone="green" comparison={data.comparison.finalized} />
        <StatCard title="Prontuários pendentes" value={data.summary.pendingRecords} hint="de consultas concluídas" icon={Clock3} tone="amber" comparison={data.comparison.pendingRecords} />
        <StatCard title="Canceladas" value={data.summary.cancelled} hint="no período" icon={ArrowDown} tone="red" comparison={data.comparison.cancelled} />
        <StatCard title="Remarcadas" value={data.summary.rescheduled} hint="consultas distintas" icon={RefreshCw} tone="amber" comparison={data.comparison.rescheduled} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]"><article className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><div className="mb-5"><h2 className="text-lg font-medium">Atividade da clínica</h2><p className="mt-1 text-sm text-muted-foreground">Cada série usa o momento em que o evento ocorreu.</p></div><ActivityChart series={data.series} /></article>
        <article className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-medium">Próximas consultas</h2><p className="mt-1 text-sm text-muted-foreground">Os cinco próximos atendimentos da clínica.</p></div><Link className="text-sm font-medium text-brand hover:underline" href="/agenda">Abrir agenda</Link></div>{data.upcoming.length ? <div className="mt-4 divide-y divide-border">{data.upcoming.map((appointment) => <Link key={appointment.id} href={`/agenda/${appointment.id}`} className="flex gap-3 py-4 first:pt-1 last:pb-1"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><UserRound size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="truncate text-sm font-medium">{appointment.patientName}</strong><span className="shrink-0 text-xs font-semibold text-brand">{timeLabel(appointment.startsAt, data.timezone)}</span></span><span className="mt-1 block truncate text-xs text-muted-foreground">{appointment.serviceName} · {appointment.professionalName}</span><span className="mt-1 inline-block rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground">{statusLabel[appointment.status] ?? appointment.status}</span></span></Link>)}</div> : <div className="mt-8 rounded-2xl bg-background px-4 py-8 text-center"><CalendarDays className="mx-auto text-muted-foreground" size={22} /><p className="mt-3 text-sm font-medium">Sem próximas consultas</p><p className="mt-1 text-xs text-muted-foreground">Os novos agendamentos aparecerão aqui.</p></div>}</article></section>

      {data.financial ? <section className="mt-6 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-success/10 text-success"><WalletCards size={19} /></span><div><h2 className="text-lg font-medium">Resumo financeiro</h2><p className="mt-1 text-sm text-muted-foreground">Previsão, valores em aberto e recebimentos aparecem separados.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl bg-background p-4"><p className="text-xs text-muted-foreground">Previsto · pré-agendadas</p><p className="mt-2 text-xl font-semibold">{money(data.financial.forecastScheduled)}</p></div><div className="rounded-2xl bg-background p-4"><p className="text-xs text-muted-foreground">Previsto · confirmadas</p><p className="mt-2 text-xl font-semibold">{money(data.financial.forecastConfirmed)}</p></div><div className="rounded-2xl bg-background p-4"><p className="text-xs text-muted-foreground">A receber no período</p><p className="mt-2 text-xl font-semibold">{money(data.financial.receivable)}</p></div><div className="rounded-2xl bg-background p-4"><p className="text-xs text-muted-foreground">Recebido no período</p><p className="mt-2 text-xl font-semibold">{money(data.financial.received)}</p></div></div>{data.financial.forecastUnpriced ? <p className="mt-4 inline-flex items-center gap-2 text-xs text-warning"><CircleDollarSign size={14} />{data.financial.forecastUnpriced} consulta(s) sem preço configurado; fora da previsão.</p> : null}<p className="mt-2 text-xs text-muted-foreground">Previsão considera consultas futuras deste período. Não representa receita garantida.</p></section> : null}
    </> : null}
  </div></main>;
}
