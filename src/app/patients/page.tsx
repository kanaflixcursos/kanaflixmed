"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, CalendarDays, Mail, Pencil, Phone, Plus, Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Patient = {
  id: string;
  record_number: number;
  display_name: string;
  legal_name: string | null;
  birth_date: string | null;
  phone_e164: string | null;
  email: string | null;
  notes: string | null;
};

type PatientForm = {
  displayName: string;
  legalName: string;
  birthDate: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyForm: PatientForm = { displayName: "", legalName: "", birthDate: "", phone: "", email: "", notes: "" };

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`));
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function loadPatients(query = "") {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/patients${query ? `?q=${encodeURIComponent(query)}` : ""}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "AUTH_REQUIRED" ? "Entre na sua conta para acessar os pacientes." : "Não foi possível carregar os pacientes.");
      setPatients(payload.patients ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os pacientes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPatients(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredPatients = useMemo(() => {
    if (!search) return patients;
    const normalized = search.toLocaleLowerCase();
    return patients.filter((patient) => patient.display_name.toLocaleLowerCase().includes(normalized));
  }, [patients, search]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/patients", { method: editingPatient ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingPatient ? { ...form, id: editingPatient.id } : form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "AUTH_REQUIRED" ? "Entre na sua conta antes de cadastrar um paciente." : payload.error === "PATIENT_ALREADY_EXISTS" ? "Já existe um paciente com esses dados." : payload.error === "PATIENT_NOT_FOUND" ? "Esse paciente não está mais disponível." : "Revise os dados e tente novamente.");
      setForm(emptyForm);
      setIsModalOpen(false);
      setEditingPatient(null);
      await loadPatients(search);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o paciente.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive(patient: Patient) {
    if (!window.confirm(`Inativar o cadastro de ${patient.display_name}? O histórico será preservado.`)) return;

    setIsArchiving(patient.id);
    setError(null);
    try {
      const response = await fetch("/api/patients", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: patient.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "PATIENT_NOT_FOUND" ? "Esse paciente já foi inativado." : "Não foi possível inativar o paciente.");
      await loadPatients(search);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Não foi possível inativar o paciente.");
    } finally {
      setIsArchiving(null);
    }
  }

  function openNewPatient() {
    setError(null);
    setEditingPatient(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEditPatient(patient: Patient) {
    setError(null);
    setEditingPatient(patient);
    setForm({
      displayName: patient.display_name,
      legalName: patient.legal_name ?? "",
      birthDate: patient.birth_date ?? "",
      phone: patient.phone_e164 ?? "",
      email: patient.email ?? "",
      notes: patient.notes ?? "",
    });
    setIsModalOpen(true);
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <button className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground" onClick={() => router.push("/")}><ArrowLeft size={16} />Voltar para visão geral</button>
        <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-brand">Relacionamento</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">Pacientes</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Encontre e organize os pacientes da sua clínica.</p></div><button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-medium text-brand-foreground shadow-sm transition hover:bg-brand-hover" onClick={openNewPatient}><Plus size={18} />Novo paciente</button></header>

        <section className="mt-8 rounded-3xl border border-border bg-surface shadow-sm"><div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="text-lg font-medium">Todos os pacientes</h2><p className="mt-1 text-sm text-muted-foreground">{patients.length} cadastro{patients.length === 1 ? "" : "s"} ativo{patients.length === 1 ? "" : "s"}</p></div><label className="relative block sm:w-80"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-brand" placeholder="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          {error ? <div className="m-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger sm:m-6">{error}</div> : null}
          {isLoading ? <div className="p-12 text-center text-sm text-muted-foreground">Carregando pacientes...</div> : filteredPatients.length === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><UserRound size={24} /></span><h3 className="mt-5 text-lg font-medium">{patients.length === 0 ? "Nenhum paciente cadastrado" : "Nenhum resultado encontrado"}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{patients.length === 0 ? "Comece adicionando o primeiro paciente da sua clínica." : "Tente buscar por outro nome."}</p>{patients.length === 0 ? <button className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover" onClick={openNewPatient}><Plus size={16} />Adicionar paciente</button> : null}</div> : <div className="divide-y divide-border">{filteredPatients.map((patient) => <article className="flex flex-col gap-4 px-5 py-5 transition hover:bg-surface-muted/50 sm:flex-row sm:items-center sm:px-6" key={patient.id}><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f0e4dc] text-sm font-medium text-[#74513c]">{initials(patient.display_name)}</span><div className="min-w-0 flex-1"><Link className="truncate text-sm font-medium transition hover:text-brand" href={`/patients/${patient.id}`}>{patient.display_name}</Link><p className="mt-1 text-xs text-muted-foreground">Prontuário #{patient.record_number} · Nascimento: {formatDate(patient.birth_date)}</p></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Phone size={13} />{patient.phone_e164 ?? "Telefone não informado"}</span>{patient.email ? <span className="inline-flex items-center gap-1.5"><Mail size={13} />{patient.email}</span> : null}</div><div className="flex shrink-0 gap-2"><button aria-label={`Editar ${patient.display_name}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground transition hover:border-brand hover:text-brand" onClick={() => openEditPatient(patient)}><Pencil size={14} />Editar</button><button aria-label={`Inativar ${patient.display_name}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground transition hover:border-danger hover:text-danger disabled:opacity-50" disabled={isArchiving === patient.id} onClick={() => void handleArchive(patient)}><Archive size={14} />{isArchiving === patient.id ? "Inativando" : "Inativar"}</button></div></article>)}</div>}
        </section>
      </div>

      {isModalOpen ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsModalOpen(false); }}><section aria-label={editingPatient ? "Editar paciente" : "Novo paciente"} className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-8"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-brand">Cadastro</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{editingPatient ? "Editar paciente" : "Novo paciente"}</h2></div><button aria-label="Fechar cadastro" className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-surface-muted" onClick={() => setIsModalOpen(false)}><X size={18} /></button></div><form className="mt-7 space-y-4" onSubmit={handleSubmit}><label className="block"><span className="mb-2 block text-sm font-medium">Nome de exibição</span><input className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-brand" placeholder="Mariana Costa" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required /></label><label className="block"><span className="mb-2 block text-sm font-medium">Nome completo / legal</span><input className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-brand" placeholder="Nome completo do paciente" value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-medium">Data de nascimento</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-brand" type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></span></label><label className="block"><span className="mb-2 block text-sm font-medium">Telefone</span><input className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-brand" placeholder="(11) 99999-0000" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label></div><label className="block"><span className="mb-2 block text-sm font-medium">E-mail</span><input className="h-11 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand" type="email" placeholder="paciente@email.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="block"><span className="mb-2 block text-sm font-medium">Observações internas</span><textarea className="min-h-24 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand" placeholder="Informações administrativas não clínicas" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end"><button className="h-11 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-surface-muted" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</button><button className="h-11 rounded-xl bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60" disabled={isSaving} type="submit">{isSaving ? "Salvando..." : editingPatient ? "Salvar alterações" : "Salvar paciente"}</button></div></form></section></div> : null}
    </main>
  );
}
