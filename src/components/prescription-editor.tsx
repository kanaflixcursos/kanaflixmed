"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { FileText, Printer, Save } from "lucide-react";

type Prescription = { body: string; version: number } | null;

export function PrescriptionEditor({ id, readOnly }: { id: string; readOnly: boolean }) {
  const router = useRouter();
  const [prescription, setPrescription] = useState<Prescription>(null);
  const [body, setBody] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/appointments/${id}/prescription`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error("Não foi possível carregar a prescrição.");
        if (active) { setPrescription(payload.prescription); setBody(payload.prescription?.body ?? ""); setCanEdit(payload.canEdit); }
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a prescrição."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(`/api/appointments/${id}/prescription`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, version: prescription?.version ?? 0 }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "PRESCRIPTION_CONFLICT" ? "A prescrição foi alterada em outra sessão. Atualize a página." : "Não foi possível salvar a prescrição.");
      setPrescription(payload.prescription);
      router.push(`/agenda/${id}/receita`);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar a prescrição."); }
    finally { setSaving(false); }
  }

  return <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"><h2 className="inline-flex items-center gap-2 text-lg font-medium"><FileText size={19} className="text-brand" />Prescrição para impressão</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Rascunho de receita simples; não possui assinatura digital. Confira os requisitos do medicamento antes de imprimir e assinar.</p>
    {error ? <p role="alert" className="mt-4 rounded-xl bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
    {loading ? <p className="mt-5 text-sm text-muted-foreground">Carregando prescrição…</p> : <form onSubmit={save} className="mt-4"><label htmlFor="prescription-body" className="block text-xs font-medium">Medicamentos e orientações</label><textarea id="prescription-body" required maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} disabled={readOnly || !canEdit} placeholder="Escreva cada item com medicamento, dose, via, frequência, duração e quantidade, conforme sua avaliação clínica." className="mt-2 min-h-36 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 disabled:opacity-70" /><div className="mt-3 flex flex-wrap justify-end gap-2">{prescription ? <Link href={`/agenda/${id}/receita`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand px-3 text-xs font-medium text-brand hover:bg-brand-soft"><Printer size={15} />Visualizar e imprimir</Link> : null}{!readOnly && canEdit ? <button type="submit" disabled={saving || !body.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-3 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60"><Save size={15} />{saving ? "Salvando…" : "Salvar e visualizar"}</button> : null}</div></form>}
  </section>;
}
