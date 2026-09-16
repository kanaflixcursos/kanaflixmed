"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Stethoscope,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type NavItem = { label: string; icon: typeof LayoutDashboard };

const navItems: NavItem[] = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Hoje", icon: Clock3 },
  { label: "Agenda", icon: CalendarDays },
  { label: "Pacientes", icon: UsersRound },
  { label: "Financeiro", icon: WalletCards },
  { label: "Relatórios", icon: FileText },
];

const appointments = [
  { time: "08:30", patient: "Mariana Costa", service: "Consulta de retorno", professional: "Dra. Ana Ribeiro", status: "Confirmado", tone: "brand", initials: "MC" },
  { time: "09:15", patient: "Rafael Mendes", service: "Primeira consulta", professional: "Dr. Lucas Almeida", status: "Aguardando", tone: "warning", initials: "RM" },
  { time: "10:00", patient: "Camila Nogueira", service: "Avaliação clínica", professional: "Dra. Ana Ribeiro", status: "Agendado", tone: "neutral", initials: "CN" },
  { time: "11:30", patient: "João Vitor Lima", service: "Consulta de retorno", professional: "Dr. Lucas Almeida", status: "Agendado", tone: "neutral", initials: "JL" },
  { time: "14:00", patient: "Beatriz Martins", service: "Consulta inicial", professional: "Dra. Ana Ribeiro", status: "Agendado", tone: "neutral", initials: "BM" },
];

const metrics = [
  { label: "Consultas hoje", value: "18", detail: "+3 que ontem", icon: CalendarDays, trend: "up" },
  { label: "Ocupação da agenda", value: "82%", detail: "+8% este mês", icon: Activity, trend: "up" },
  { label: "Recebimentos no mês", value: "R$ 24.680", detail: "+12,4% este mês", icon: CircleDollarSign, trend: "up" },
  { label: "Pendências financeiras", value: "R$ 3.240", detail: "6 cobranças em aberto", icon: WalletCards, trend: "down" },
];

function Badge({ children, tone }: { children: React.ReactNode; tone: string }) {
  const classes = { brand: "bg-brand-soft text-brand", warning: "bg-warning/10 text-warning", success: "bg-success/10 text-success", neutral: "bg-surface-muted text-foreground" } as Record<string, string>;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${classes[tone] ?? classes.neutral}`}>{children}</span>;
}

function Sidebar({ active, setActive, open, onClose }: { active: string; setActive: (label: string) => void; open: boolean; onClose: () => void }) {
  const router = useRouter();
  return <>
    <AnimatePresence>{open && <motion.button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />}</AnimatePresence>
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-surface px-5 py-7 transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between px-3"><div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-xl bg-brand text-brand-foreground"><Stethoscope size={18} strokeWidth={2.1} /></div><span className="text-[19px] font-medium tracking-[-0.04em]">Kanaflix <span className="text-brand">MED</span></span></div><button className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-surface-muted hover:text-foreground lg:hidden" onClick={onClose} aria-label="Fechar menu"><X size={18} /></button></div>
      <button className="mt-12 flex items-center gap-3 rounded-2xl bg-surface-muted px-3 py-2.5 text-left hover:bg-surface-muted/80"><span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-sm font-medium text-brand">KM</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">Clínica Movimento</span><span className="block text-xs text-muted-foreground">Workspace atual</span></span><ChevronDown size={16} className="text-muted-foreground" /></button>
    <nav className="mt-7 space-y-1.5" aria-label="Navegação principal">{navItems.map((item) => { const Icon = item.icon; const isActive = active === item.label; return <button key={item.label} onClick={() => { setActive(item.label); onClose(); if (item.label === "Pacientes") router.push("/patients"); if (item.label === "Agenda") router.push("/agenda"); }} className={`flex h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-sm transition-colors ${isActive ? "bg-brand-soft font-medium text-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}><Icon size={19} strokeWidth={1.9} /><span>{item.label}</span>{item.label === "Hoje" && <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-foreground">5</span>}</button>; })}</nav>
      <div className="mt-auto border-t border-border pt-5"><button className="flex h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"><Settings2 size={19} strokeWidth={1.9} /><span>Configurações</span></button><div className="mt-5 flex items-center gap-3 px-3.5"><span className="grid size-9 place-items-center rounded-full bg-[#e8dfd8] text-xs font-medium text-[#6d5141]">AR</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">Ana Ribeiro</span><span className="block text-xs text-muted-foreground">Administradora</span></span><MoreHorizontal size={17} className="text-muted-foreground" /></div></div>
    </aside>
  </>;
}

function MetricCard({ metric }: { metric: typeof metrics[number] }) {
  const Icon = metric.icon;
  return <article className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{metric.label}</p><span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={18} strokeWidth={1.9} /></span></div><p className="mt-5 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">{metric.value}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">{metric.trend === "up" ? <ArrowUpRight size={14} className="text-success" /> : <ArrowDownRight size={14} className="text-warning" />}{metric.detail}</p></article>;
}

type DashboardAppointmentView = typeof appointments[number];

function Dashboard({ active, appointmentList }: { active: string; appointmentList: DashboardAppointmentView[] }) {
  return <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
    <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-medium text-brand"><span>Quarta-feira, 16 de setembro</span></div><h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">Bom dia, Ana</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Aqui está o que está acontecendo na sua clínica hoje.</p></div><button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover"><Plus size={18} />Novo agendamento</button></header>
    <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do dia">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.8fr]"><article className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"><div className="flex items-center justify-between border-b border-border p-5 sm:p-6"><div><h2 className="text-lg font-medium">Agenda de hoje</h2><p className="mt-1 text-sm text-muted-foreground">{appointmentList.length} consultas exibidas</p></div><button className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-brand hover:bg-brand-soft">Ver agenda <ArrowUpRight size={16} /></button></div><div className="divide-y divide-border">{appointmentList.map((appointment) => <div key={`${appointment.time}-${appointment.patient}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted/60 sm:px-6"><div className="w-12 shrink-0 text-sm font-medium tabular-nums">{appointment.time}</div><div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f0e4dc] text-xs font-medium text-[#74513c]">{appointment.initials}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{appointment.patient}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{appointment.service} · {appointment.professional}</p></div><Badge tone={appointment.tone}>{appointment.status}</Badge><button className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-surface-muted hover:text-foreground" aria-label={`Mais ações para ${appointment.patient}`}><MoreHorizontal size={17} /></button></div>)}</div></article><div className="space-y-6"><article className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-lg font-medium">Acompanhamento</h2><p className="mt-1 text-sm text-muted-foreground">Indicadores do mês</p></div><button className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-surface-muted hover:text-foreground" aria-label="Mais opções de acompanhamento"><MoreHorizontal size={17} /></button></div><div className="mt-7 space-y-5"><div><div className="flex items-center justify-between text-sm"><span>Consultas realizadas</span><span className="font-medium">124 <span className="text-xs text-muted-foreground">/ 148</span></span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full w-[84%] rounded-full bg-brand" /></div></div><div><div className="flex items-center justify-between text-sm"><span>Retornos agendados</span><span className="font-medium">68 <span className="text-xs text-muted-foreground">/ 82</span></span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full w-[72%] rounded-full bg-success" /></div></div><div><div className="flex items-center justify-between text-sm"><span>Confirmações</span><span className="font-medium">91 <span className="text-xs text-muted-foreground">/ 96</span></span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full w-[95%] rounded-full bg-[#7b47e8]" /></div></div></div><div className="mt-7 border-t border-border pt-5"><p className="text-xs text-muted-foreground">Taxa de faltas</p><p className="mt-1 text-2xl font-medium tracking-[-0.03em]">4,8%</p><p className="mt-1 text-xs text-success">↓ 1,2% em relação ao mês passado</p></div></article><article className="rounded-3xl border border-border bg-surface-muted p-5 sm:p-6"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><ClipboardList size={19} /></div><div><h2 className="text-base font-medium">Próximo passo</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Você tem 6 cobranças pendentes de confirmação neste mês.</p><button className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover">Ver pendências <ArrowUpRight size={16} /></button></div></div></article></div></section>
  </motion.div>;
}

export default function Home() {
  const [active, setActive] = useState("Visão geral");
  const [menuOpen, setMenuOpen] = useState(false);
  const [appointmentList, setAppointmentList] = useState(appointments);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { context?: unknown; appointments?: Array<{ startsAt: string; patientName: string; type: string; providerName: string | null; status: string }> } | null) => {
        if (cancelled || !payload?.context || !payload.appointments) return;
        const statusLabels: Record<string, { label: string; tone: string }> = { CONFIRMED: { label: "Confirmado", tone: "brand" }, CHECKED_IN: { label: "Em atendimento", tone: "success" }, IN_PROGRESS: { label: "Em atendimento", tone: "success" }, CANCELLED: { label: "Cancelado", tone: "warning" } };
        setAppointmentList(payload.appointments.map((appointment) => {
          const status = statusLabels[appointment.status] ?? { label: "Agendado", tone: "neutral" };
          const initials = appointment.patientName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
          return { time: new Date(appointment.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), patient: appointment.patientName, service: appointment.type, professional: appointment.providerName ?? "Profissional", status: status.label, tone: status.tone, initials };
        }));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  return <div className="min-h-screen bg-background"><Sidebar active={active} setActive={setActive} open={menuOpen} onClose={() => setMenuOpen(false)} /><div className="lg:pl-72"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border bg-surface/95 px-5 backdrop-blur sm:px-8 lg:px-12"><div className="flex items-center gap-3"><button className="grid size-11 place-items-center rounded-2xl text-muted-foreground hover:bg-surface-muted hover:text-foreground lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><div className="hidden h-11 max-w-sm items-center gap-2 rounded-2xl bg-surface-muted px-3.5 text-sm text-muted-foreground sm:flex sm:w-80"><Search size={18} /><span>Buscar paciente ou agendamento</span><kbd className="ml-auto rounded-lg border border-border bg-surface px-1.5 py-0.5 text-[10px]">⌘ K</kbd></div><span className="text-base font-medium sm:hidden">Kanaflix <span className="text-brand">MED</span></span></div><div className="flex items-center gap-1"><button className="relative grid size-11 place-items-center rounded-2xl text-muted-foreground hover:bg-surface-muted hover:text-foreground" aria-label="Notificações"><Bell size={19} /><span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-brand" /></button><button className="hidden size-11 place-items-center rounded-2xl text-muted-foreground hover:bg-surface-muted hover:text-foreground sm:grid" aria-label="Meu perfil"><UserRound size={19} /></button></div></header><main><Dashboard active={active} appointmentList={appointmentList} /></main></div></div>;
}
