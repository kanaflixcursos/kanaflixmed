"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Mail, Pencil, Phone, Plus, Search, UserRound } from "lucide-react";

type Patient = { id: string; record_number: number; display_name: string; birth_date: string | null; phone_e164: string | null; email: string | null };
const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`)) : "Data não informada";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const response = await fetch("/api/patients", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "AUTH_REQUIRED" ? "Entre na sua conta para acessar os pacientes." : "Não foi possível carregar os pacientes.");
      setPatients(payload.patients ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os pacientes."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void loadPatients(); }, 0); return () => window.clearTimeout(timer); }, [loadPatients]);
  const filteredPatients = useMemo(() => patients.filter((patient) => patient.display_name.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [patients, search]);

  async function handleArchive(patient: Patient) {
    if (!window.confirm(`Inativar o cadastro de ${patient.display_name}? O histórico será preservado.`)) return;
    setIsArchiving(patient.id); setError(null);
    try {
      const response = await fetch("/api/patients", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: patient.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "PATIENT_NOT_FOUND" ? "Esse paciente já foi inativado." : "Não foi possível inativar o paciente.");
      await loadPatients();
    } catch (archiveError) { setError(archiveError instanceof Error ? archiveError.message : "Não foi possível inativar o paciente."); }
    finally { setIsArchiving(null); }
  }

  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-brand">Relacionamento</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">Pacientes</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Encontre e organize os pacientes da sua clínica.</p></div><Link href="/patients/novo" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-medium text-brand-foreground shadow-sm transition hover:bg-brand-hover"><Plus size={18} />Novo paciente</Link></header>
    <section className="mt-8 rounded-3xl border border-border bg-surface shadow-sm"><div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="text-lg font-medium">Todos os pacientes</h2><p className="mt-1 text-sm text-muted-foreground">{patients.length} cadastro{patients.length === 1 ? "" : "s"} ativo{patients.length === 1 ? "" : "s"}</p></div><label className="relative block sm:w-80"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-brand" placeholder="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
      {error ? <div role="alert" className="m-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger sm:m-6">{error}</div> : null}
      {isLoading ? <div className="p-12 text-center text-sm text-muted-foreground">Carregando pacientes...</div> : filteredPatients.length === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><UserRound size={24} /></span><h3 className="mt-5 text-lg font-medium">{patients.length === 0 ? "Nenhum paciente cadastrado" : "Nenhum resultado encontrado"}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{patients.length === 0 ? "Comece adicionando o primeiro paciente da sua clínica." : "Tente buscar por outro nome."}</p>{patients.length === 0 ? <Link href="/patients/novo" className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"><Plus size={16} />Adicionar paciente</Link> : null}</div> : <div className="divide-y divide-border">{filteredPatients.map((patient) => <article className="flex flex-col gap-4 px-5 py-5 transition hover:bg-surface-muted/50 sm:flex-row sm:items-center sm:px-6" key={patient.id}><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f0e4dc] text-sm font-medium text-[#74513c]">{initials(patient.display_name)}</span><div className="min-w-0 flex-1"><Link className="truncate text-sm font-medium transition hover:text-brand" href={`/patients/${patient.id}`}>{patient.display_name}</Link><p className="mt-1 text-xs text-muted-foreground">Prontuário #{patient.record_number} · Nascimento: {formatDate(patient.birth_date)}</p></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Phone size={13} />{patient.phone_e164 ?? "Telefone não informado"}</span>{patient.email ? <span className="inline-flex items-center gap-1.5"><Mail size={13} />{patient.email}</span> : null}</div><div className="flex shrink-0 gap-2"><Link aria-label={`Editar ${patient.display_name}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground transition hover:border-brand hover:text-brand" href={`/patients/${patient.id}/editar`}><Pencil size={14} />Editar</Link><button aria-label={`Inativar ${patient.display_name}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground transition hover:border-danger hover:text-danger disabled:opacity-50" disabled={isArchiving === patient.id} onClick={() => void handleArchive(patient)}><Archive size={14} />{isArchiving === patient.id ? "Inativando" : "Inativar"}</button></div></article>)}</div>}
    </section>
  </div></main>;
}
