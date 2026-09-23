"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";

type PrintData = {
  prescription: { body: string; updated_at: string } | null;
  context: { patientName: string; professionalName: string; professionalTitle: string; councilType: string; councilNumber: string; councilState: string; clinicName: string; clinicAddress: string; clinicPhone: string; timezone: string };
};

export function PrescriptionPrint({ id }: { id: string }) {
  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/appointments/${id}/prescription`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error("Não foi possível abrir a prescrição.");
        if (active) setData(payload);
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir a prescrição."); }
    }
    void load();
    return () => { active = false; };
  }, [id]);

  const context = data?.context;
  const date = data?.prescription && context ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: context.timezone }).format(new Date(data.prescription.updated_at)) : "";
  const council = context ? [context.councilType, context.councilNumber, context.councilState].filter(Boolean).join(" ") : "";
  const identifiedDoctor = context?.councilType.toUpperCase() === "CRM" && Boolean(context.councilNumber.trim()) && /^[A-Z]{2}$/.test(context.councilState.toUpperCase());
  return <main className="print-prescription-page min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto max-w-4xl"><div className="prescription-screen-actions mb-5 flex flex-wrap items-center justify-between gap-3"><Link href={`/agenda/${id}/prontuario`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"><ArrowLeft size={16} />Voltar ao prontuário</Link>{data?.prescription ? <button disabled={!identifiedDoctor} onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"><Printer size={16} />Imprimir</button> : null}</div>
    {data?.prescription && !identifiedDoctor ? <p role="alert" className="prescription-screen-actions mb-4 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">Para imprimir, preencha Conselho = CRM, número e UF no <Link className="underline" href="/perfil">perfil profissional</Link>.</p> : null}
    {error ? <p role="alert" className="rounded-xl bg-danger/5 p-4 text-sm text-danger">{error}</p> : !data ? <p className="text-sm text-muted-foreground">Carregando receita…</p> : !data.prescription ? <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">Nenhuma prescrição salva para este atendimento.</p> : <article className="prescription-paper min-h-[900px] rounded-2xl border border-border bg-white p-8 shadow-sm sm:p-12"><header className="border-b border-border pb-6"><h1 className="text-2xl font-semibold">{context?.clinicName}</h1>{context?.clinicAddress ? <p className="mt-1 text-sm text-muted-foreground">{context.clinicAddress}</p> : null}{context?.clinicPhone ? <p className="text-sm text-muted-foreground">{context.clinicPhone}</p> : null}</header><div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">Paciente</p><p className="mt-1 text-lg font-medium">{context?.patientName}</p></div><p className="text-sm text-muted-foreground">{date}</p></div><h2 className="mt-10 border-b border-border pb-2 text-lg font-medium">Prescrição</h2><p className="mt-6 min-h-72 whitespace-pre-wrap text-base leading-8">{data.prescription.body}</p><footer className="mt-16 border-t border-border pt-8"><p className="font-medium">{context?.professionalName}</p>{context?.professionalTitle ? <p className="text-sm text-muted-foreground">{context.professionalTitle}</p> : null}<p className="text-sm text-muted-foreground">{council || "Registro profissional: conferir antes do uso"}</p><div className="mt-16 w-72 border-t border-foreground pt-2 text-center text-xs text-muted-foreground">Assinatura e carimbo do profissional</div></footer></article>}
    {data?.prescription ? <p className="prescription-screen-actions mt-4 text-xs text-muted-foreground">Modelo para impressão e assinatura física. Não substitui receituário especial nem prescrição digital assinada.</p> : null}
  </div></main>;
}
