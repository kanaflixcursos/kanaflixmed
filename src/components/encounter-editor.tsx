"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileCheck2, LockKeyhole, Save } from "lucide-react";
import { EncounterAttachments } from "@/components/encounter-attachments";
import { PrescriptionEditor } from "@/components/prescription-editor";

type Encounter = { status: "DRAFT" | "FINALIZED"; chief_complaint: string | null; history: string | null; medical_history: string | null; allergies: string | null; physical_exam: string | null; assessment: string | null; plan: string | null; additional_notes: string | null; version: number; finalized_at: string | null };
type EncounterForm = { chiefComplaint: string; history: string; medicalHistory: string; allergies: string; physicalExam: string; assessment: string; plan: string; additionalNotes: string };
const emptyForm: EncounterForm = { chiefComplaint: "", history: "", medicalHistory: "", allergies: "", physicalExam: "", assessment: "", plan: "", additionalNotes: "" };
const fields: { key: keyof EncounterForm; label: string; placeholder: string }[] = [
  { key: "chiefComplaint", label: "Queixa principal", placeholder: "Motivo principal do atendimento" },
  { key: "history", label: "História clínica", placeholder: "Evolução e informações relatadas pelo paciente" },
  { key: "medicalHistory", label: "Antecedentes", placeholder: "Histórico clínico relevante" },
  { key: "allergies", label: "Alergias", placeholder: "Alergias conhecidas ou informação pendente" },
  { key: "physicalExam", label: "Exame", placeholder: "Achados do exame" },
  { key: "assessment", label: "Avaliação", placeholder: "Avaliação clínica" },
  { key: "plan", label: "Plano", placeholder: "Conduta e próximos passos" },
  { key: "additionalNotes", label: "Observações complementares", placeholder: "Informações adicionais do atendimento" },
];

export function EncounterEditor({ id }: { id: string }) {
  const [patientName, setPatientName] = useState("");
  const [appointmentStatus, setAppointmentStatus] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [form, setForm] = useState<EncounterForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [appointmentResponse, encounterResponse] = await Promise.all([
        fetch(`/api/appointments/${id}`, { cache: "no-store" }),
        fetch(`/api/appointments/${id}/encounter`, { cache: "no-store" }),
      ]);
      const [appointmentPayload, encounterPayload] = await Promise.all([appointmentResponse.json(), encounterResponse.json()]);
      if (!appointmentResponse.ok) throw new Error("Consulta não encontrada.");
      setPatientName(appointmentPayload.appointment.patientName);
      setAppointmentStatus(appointmentPayload.appointment.status);
      setCanWrite(appointmentPayload.permissions.canWriteEncounter);
      if (!encounterResponse.ok) throw new Error(encounterPayload.error === "ENCOUNTER_FORBIDDEN" ? "Este prontuário está restrito ao profissional responsável e à administração." : "Não foi possível abrir o prontuário.");
      const loaded: Encounter | null = encounterPayload.encounter;
      setEncounter(loaded);
      if (loaded) setForm({ chiefComplaint: loaded.chief_complaint ?? "", history: loaded.history ?? "", medicalHistory: loaded.medical_history ?? "", allergies: loaded.allergies ?? "", physicalExam: loaded.physical_exam ?? "", assessment: loaded.assessment ?? "", plan: loaded.plan ?? "", additionalNotes: loaded.additional_notes ?? "" });
      else setForm(emptyForm);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o prontuário."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function persist(finalize: boolean) {
    if (finalize && !window.confirm("Encerrar este prontuário? Depois disso, ele ficará somente para leitura.")) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/appointments/${id}/encounter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, version: encounter?.version ?? 0, finalize }) });
      const payload = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = { APPOINTMENT_NOT_COMPLETED: "Conclua a consulta antes de encerrar o prontuário.", ENCOUNTER_FINALIZED: "Este prontuário já foi encerrado e não pode ser editado.", ENCOUNTER_CONFLICT: "O prontuário foi alterado em outra sessão. Atualize antes de salvar.", ENCOUNTER_FORBIDDEN: "Somente o profissional responsável pode editar este prontuário." };
        throw new Error(messages[payload.error] ?? "Não foi possível salvar o prontuário.");
      }
      setEncounter(payload.encounter);
      setNotice(finalize ? "Prontuário encerrado e registrado." : "Rascunho salvo.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o prontuário."); }
    finally { setSaving(false); }
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void persist(false);
  }

  if (loading) return <main className="min-h-screen bg-background px-5 py-8"><div className="mx-auto max-w-4xl text-sm text-muted-foreground">Carregando prontuário…</div></main>;
  if (error && !patientName) return <main className="min-h-screen bg-background px-5 py-8"><div className="mx-auto max-w-4xl"><Link href={`/agenda/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} />Voltar à consulta</Link><p className="mt-5 rounded-xl bg-danger/5 p-4 text-sm text-danger">{error}</p></div></main>;

  const inCare = ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"].includes(appointmentStatus);
  const readOnly = encounter?.status === "FINALIZED" || !canWrite || !inCare;
  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-10"><div className="mx-auto max-w-6xl">
    <Link href={`/agenda/${id}`} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"><ArrowLeft size={16} />Voltar à consulta</Link>
    <header className="border-b border-border pb-6"><p className="text-sm font-medium text-brand">Registro clínico</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em]">Prontuário · {patientName}</h1><p className="mt-2 text-sm text-muted-foreground">Anotações ligadas a esta consulta.</p></header>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p> : null}{notice ? <p role="status" className="mt-5 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">{notice}</p> : null}
    {!readOnly && appointmentStatus !== "COMPLETED" ? <p className="mt-5 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">Você pode preencher e salvar o prontuário durante o atendimento. Para encerrá-lo, conclua a consulta primeiro.</p> : null}
    {readOnly ? <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-background px-4 py-3 text-sm text-muted-foreground"><LockKeyhole size={16} />{encounter?.status === "FINALIZED" ? `Prontuário encerrado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date(encounter.finalized_at!))}. Somente leitura.` : !inCare ? "Confirme e inicie o atendimento para abrir o prontuário." : "Acesso somente para leitura."}</p> : null}
    <form onSubmit={saveDraft} className="mt-6 grid gap-4 md:grid-cols-2">{fields.map((field) => <label key={field.key} className="block rounded-2xl border border-border bg-surface p-4 sm:p-5"><span className="mb-2 block text-sm font-medium">{field.label}</span><textarea value={form[field.key]} onChange={(event) => setForm((previous) => ({ ...previous, [field.key]: event.target.value }))} disabled={readOnly} maxLength={12000} placeholder={field.placeholder} className="min-h-28 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 disabled:opacity-80" /></label>)}
      {!readOnly ? <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end md:col-span-2"><button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:border-brand disabled:opacity-60"><Save size={16} />{saving ? "Salvando…" : "Salvar rascunho"}</button>{appointmentStatus === "COMPLETED" ? <button type="button" disabled={saving} onClick={() => void persist(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"><FileCheck2 size={16} />Encerrar prontuário</button> : null}</div> : null}
    </form>
    {inCare ? <div className="mt-6 grid gap-4 lg:grid-cols-2"><EncounterAttachments id={id} readOnly={readOnly} /><PrescriptionEditor id={id} readOnly={readOnly} /></div> : null}
  </div></main>;
}
