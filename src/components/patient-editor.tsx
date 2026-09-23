"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, UserRound } from "lucide-react";

type PatientForm = { displayName: string; legalName: string; birthDate: string; phone: string; email: string; notes: string };
const emptyForm: PatientForm = { displayName: "", legalName: "", birthDate: "", phone: "", email: "", notes: "" };

export function PatientEditor({ patientId }: { patientId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [loading, setLoading] = useState(Boolean(patientId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const backTo = patientId ? `/patients/${patientId}` : "/patients";

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/patients/${patientId}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error === "PATIENT_NOT_FOUND" ? "Paciente não encontrado." : "Não foi possível carregar o cadastro.");
        if (active) setForm({ displayName: payload.patient.display_name, legalName: payload.patient.legal_name ?? "", birthDate: payload.patient.birth_date ?? "", phone: payload.patient.phone_e164 ?? "", email: payload.patient.email ?? "", notes: payload.patient.notes ?? "" });
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o cadastro."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [patientId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/patients", { method: patientId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patientId ? { ...form, id: patientId } : form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "PATIENT_ALREADY_EXISTS" ? "Já existe um paciente com esses dados." : payload.error === "PATIENT_NOT_FOUND" ? "Esse paciente não está mais disponível." : payload.error === "INVALID_PATIENT" ? "Revise os dados informados." : "Não foi possível salvar o paciente.");
      router.push(`/patients/${payload.patient.id}`);
      router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o paciente."); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-4xl">
    <Link href={backTo} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"><ArrowLeft size={16} />Voltar {patientId ? "ao paciente" : "para pacientes"}</Link>
    <header className="border-b border-border pb-6"><p className="text-sm font-medium text-brand">Cadastro de paciente</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em]">{patientId ? "Editar paciente" : "Novo paciente"}</h1><p className="mt-2 text-sm text-muted-foreground">Dados de identificação e contato da clínica.</p></header>
    {error ? <p role="alert" className="mt-6 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p> : null}
    {loading ? <div className="mt-6 rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">Carregando cadastro…</div> : <form onSubmit={submit} className="mt-6 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><UserRound size={20} /></span><div><h2 className="font-medium">Dados do paciente</h2><p className="text-xs text-muted-foreground">Preencha o nome e os dados disponíveis.</p></div></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block"><span className="mb-2 block text-sm font-medium">Nome de exibição</span><input autoFocus required minLength={2} maxLength={120} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm" placeholder="Nome do paciente" /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium">Nome completo / legal</span><input maxLength={160} value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm" placeholder="Nome completo do paciente" /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium">Data de nascimento</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm" /></span></label>
        <label className="block"><span className="mb-2 block text-sm font-medium">Telefone</span><input type="tel" maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm" placeholder="(11) 99999-0000" /></label>
        <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-medium">E-mail</span><input type="email" maxLength={160} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm" placeholder="paciente@email.com" /></label>
        <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-medium">Informações administrativas do cadastro</span><textarea maxLength={2000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-28 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Informações fixas do cadastro. Para registros com data e hora, use a timeline do paciente." /></label>
      </div>
      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end"><Link href={backTo} className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-surface-muted">Cancelar</Link><button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"><Check size={17} />{saving ? "Salvando…" : patientId ? "Salvar alterações" : "Salvar paciente"}</button></div>
    </form>}
  </div></main>;
}
