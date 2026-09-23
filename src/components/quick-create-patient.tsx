"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

export type PatientOption = { id: string; display_name: string };

export function QuickCreatePatient({ onClose, onCreated }: { onClose: () => void; onCreated: (patient: PatientOption) => void }) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, phone, email }),
      });
      const payload = await response.json();
      if (!response.ok) {
        const message = payload.error === "PATIENT_ALREADY_EXISTS"
          ? "Já existe um cadastro com esses dados. Selecione o paciente na lista ou confira as informações."
          : payload.error === "INVALID_PATIENT"
            ? "Confira o nome e o e-mail informados."
            : "Não foi possível cadastrar o paciente. Tente novamente.";
        throw new Error(message);
      }
      onCreated(payload.patient);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível cadastrar o paciente.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/35 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="quick-patient-title" className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-brand">Cadastro rápido</p><h2 id="quick-patient-title" className="mt-1 text-xl font-medium">Novo paciente</h2><p className="mt-2 text-sm text-muted-foreground">O paciente será selecionado neste agendamento.</p></div>
        <button type="button" aria-label="Fechar cadastro rápido" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-surface-muted"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-medium">Nome de exibição</span><input ref={nameRef} required minLength={2} maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Nome do paciente" /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium">Telefone <span className="font-normal text-muted-foreground">(opcional)</span></span><input type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium">E-mail <span className="font-normal text-muted-foreground">(opcional)</span></span><input type="email" maxLength={160} value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" /></label>
        {error ? <p role="alert" className="rounded-xl bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm text-muted-foreground hover:bg-surface-muted">Cancelar</button><button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"><Plus size={16} />{saving ? "Cadastrando…" : "Cadastrar paciente"}</button></div>
      </form>
    </section>
  </div>;
}
