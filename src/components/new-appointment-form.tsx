"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Clock3, Plus } from "lucide-react";
import { PatientOption, QuickCreatePatient } from "@/components/quick-create-patient";

type Service = { id: string; name: string; duration_minutes: number; price_cents: number };
type Professional = { id: string; name: string };
type BusyTime = { startsAt: string; endsAt: string; professionalId: string; status: string };
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const humanDate = (date: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

export function NewAppointmentForm({ initialDate, initialTime, returnTo }: { initialDate: string; initialTime: string; returnTo: string }) {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [patientId, setPatientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<BusyTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [patientResponse, serviceResponse, teamResponse, clinicResponse] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/services", { cache: "no-store" }),
          fetch("/api/team", { cache: "no-store" }),
          fetch("/api/clinic", { cache: "no-store" }),
        ]);
        const [patientPayload, servicePayload, teamPayload, clinicPayload] = await Promise.all([patientResponse.json(), serviceResponse.json(), teamResponse.json(), clinicResponse.json()]);
        if (!patientResponse.ok || !serviceResponse.ok || !teamResponse.ok) throw new Error("Não foi possível carregar os dados necessários.");
        if (!active) return;
        setPatients(patientPayload.patients ?? []);
        setServices(servicePayload.services ?? []);
        setProfessionals(teamPayload.members ?? []);
        setTimezone(clinicPayload.clinic?.timezone ?? "America/Sao_Paulo");
        setServiceId(servicePayload.services?.[0]?.id ?? "");
        setProfessionalId(teamPayload.role === "PROFESSIONAL" ? teamPayload.currentUserId : teamPayload.members?.[0]?.id ?? "");
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os dados."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!date || !professionalId) return;
    let active = true;
    async function loadBusyTimes() {
      try {
        const response = await fetch(`/api/appointments?date=${date}&professionalId=${professionalId}`, { cache: "no-store" });
        const payload = await response.json();
        if (active && response.ok) setBusy(payload.appointments ?? []);
      } catch { /* A checagem definitiva ocorre no servidor ao salvar. */ }
    }
    void loadBusyTimes();
    return () => { active = false; };
  }, [date, professionalId]);

  const service = useMemo(() => services.find((item) => item.id === serviceId), [services, serviceId]);
  const timeMinutes = (value: string) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };
  const proposedStart = timeMinutes(time);
  const blocked = useMemo(() => busy.some((item) => {
    if (item.status === "CANCELLED" || item.status === "NO_SHOW") return false;
    const starts = new Date(item.startsAt);
    const startParts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone }).format(starts).split(":").map(Number);
    const endParts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone }).format(new Date(item.endsAt)).split(":").map(Number);
    const startMinute = startParts[0] * 60 + startParts[1];
    let endMinute = endParts[0] * 60 + endParts[1];
    if (endMinute <= startMinute) endMinute += 24 * 60;
    const length = service?.duration_minutes ?? 30;
    return proposedStart < endMinute && startMinute < proposedStart + length;
  }), [busy, proposedStart, service, timezone]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, serviceId, professionalId, localDate: date, localTime: time, operationalNote: note }) });
      const payload = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          APPOINTMENT_CONFLICT: "Este horário acabou de ser ocupado. Escolha outro horário.",
          APPOINTMENT_MUST_BE_FUTURE: "Escolha um horário futuro.",
          PATIENT_NOT_FOUND: "Este paciente não está mais ativo.",
          SERVICE_NOT_FOUND: "Este serviço não está mais ativo.",
          INVALID_LOCAL_DATETIME: "Confira a data e o horário escolhidos.",
          APPOINTMENT_FORBIDDEN: "Sua conta não pode agendar para este profissional.",
        };
        throw new Error(messages[payload.error] ?? "Não foi possível salvar o agendamento.");
      }
      router.push(`/agenda/${payload.appointment.id}?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Não foi possível salvar o agendamento."); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-10"><div className="mx-auto max-w-4xl">
    <Link href={returnTo} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"><ArrowLeft size={16} />Voltar para agenda</Link>
    <header className="border-b border-border pb-6"><p className="text-sm font-medium text-brand">Agenda</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em]">Novo agendamento</h1><p className="mt-2 text-sm text-muted-foreground">Cadastre o paciente, o atendimento e o horário.</p></header>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p> : null}
    {loading ? <div className="mt-6 rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">Carregando informações…</div> : <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><section className="space-y-5 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"><div><h2 className="text-lg font-medium">Dados do atendimento</h2><p className="mt-1 text-sm text-muted-foreground">As informações ficam vinculadas ao cadastro do paciente.</p></div>
      <div><label htmlFor="appointment-patient" className="mb-2 block text-sm font-medium">Paciente</label><div className="flex gap-2"><select id="appointment-patient" required value={patientId} onChange={(event) => setPatientId(event.target.value)} className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm"><option value="">Selecione um paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.display_name}</option>)}</select><button type="button" aria-label="Cadastrar novo paciente" title="Cadastrar novo paciente" onClick={() => setPatientDialogOpen(true)} className="grid size-12 shrink-0 place-items-center rounded-xl border border-brand bg-brand-soft text-brand hover:bg-brand hover:text-white"><Plus size={19} /></button></div>{patients.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Nenhum paciente ativo? Use o botão + para cadastrar sem sair desta página.</p> : null}</div>
      <label className="block"><span className="mb-2 block text-sm font-medium">Serviço</span><select required value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="">Selecione um serviço</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.duration_minutes} min</option>)}</select></label>
      <label className="block"><span className="mb-2 block text-sm font-medium">Profissional responsável</span><select required value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm">{professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="block"><span className="mb-2 block text-sm font-medium">Observação administrativa</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} className="min-h-24 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Ex.: confirmar documentos na recepção" /></label>
    </section><section className="space-y-5 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"><div><h2 className="text-lg font-medium">Data e horário</h2><p className="mt-1 text-sm text-muted-foreground">Horário local da clínica.</p></div>
      <label className="block"><span className="mb-2 block text-sm font-medium">Data</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand" /><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm" /></span><span className="mt-2 block text-xs capitalize text-muted-foreground">{humanDate(date)}</span></label>
      <label className="block"><span className="mb-2 block text-sm font-medium">Horário de início</span><span className="relative block"><Clock3 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand" /><input required type="time" step={900} value={time} onChange={(event) => setTime(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm" /></span>{blocked ? <span className="mt-2 block text-xs text-warning">Este horário se sobrepõe a outra consulta deste profissional. Escolha outro; o servidor também confere ao salvar.</span> : null}</label>
      {service ? <div className="rounded-2xl bg-background p-4"><p className="text-xs text-muted-foreground">Resumo</p><p className="mt-2 text-sm font-medium">{service.name}</p><div className="mt-3 flex items-center justify-between text-xs"><span className="text-muted-foreground">Duração</span><span>{service.duration_minutes} minutos</span></div><div className="mt-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">Valor previsto</span><span>{service.price_cents ? currency(service.price_cents) : "Sem valor definido"}</span></div></div> : null}
      <button type="submit" disabled={saving || !patientId || !serviceId || !professionalId} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"><Check size={17} />{saving ? "Salvando…" : "Salvar agendamento"}</button>
    </section></form>}
    {patientDialogOpen ? <QuickCreatePatient onClose={() => setPatientDialogOpen(false)} onCreated={(patient) => { setPatients((current) => [...current, patient].sort((a, b) => a.display_name.localeCompare(b.display_name, "pt-BR"))); setPatientId(patient.id); setPatientDialogOpen(false); }} /> : null}
  </div></main>;
}
