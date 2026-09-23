"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Download, FileText, Paperclip, Upload } from "lucide-react";

type Attachment = { id: string; file_name: string; size_bytes: number; created_at: string };

export function EncounterAttachments({ id, readOnly }: { id: string; readOnly: boolean }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/appointments/${id}/attachments`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error("Não foi possível carregar os anexos.");
        if (active) setAttachments(payload.attachments ?? []);
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os anexos."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [id]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";
    if (!/\.(pdf|docx)$/i.test(file.name) || file.size < 1 || file.size > 4 * 1024 * 1024) {
      setError("Escolha um PDF ou DOCX de até 4 MB.");
      return;
    }
    setUploading(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch(`/api/appointments/${id}/attachments`, { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "INVALID_FILE_TYPE" ? "O arquivo não corresponde a um PDF ou DOCX válido." : payload.error === "ENCOUNTER_FINALIZED" ? "Este prontuário já foi encerrado." : "Não foi possível anexar o arquivo.");
      setAttachments((current) => [payload.attachment, ...current]);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Não foi possível anexar o arquivo."); }
    finally { setUploading(false); }
  }

  return <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="inline-flex items-center gap-2 text-lg font-medium"><Paperclip size={19} className="text-brand" />Anexos</h2><p className="mt-1 text-xs text-muted-foreground">PDF ou DOCX, até 4 MB por arquivo. Acesso restrito à equipe autorizada.</p></div>{!readOnly ? <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-brand px-3 text-xs font-medium text-brand hover:bg-brand-soft"><Upload size={14} />{uploading ? "Enviando…" : "Anexar"}<input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={uploading} onChange={(event) => void upload(event)} className="sr-only" /></label> : null}</div>
    {error ? <p role="alert" className="mt-4 rounded-xl bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
    {loading ? <p className="mt-5 text-sm text-muted-foreground">Carregando anexos…</p> : attachments.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Nenhum arquivo anexado.</p> : <ul className="mt-5 divide-y divide-border">{attachments.map((file) => <li key={file.id} className="flex items-center gap-3 py-3"><FileText size={18} className="shrink-0 text-brand" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.file_name}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(file.created_at))} · {(file.size_bytes / 1024).toFixed(0)} KB</p></div><a href={`/api/appointments/${id}/attachments/${file.id}`} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs font-medium hover:border-brand hover:text-brand"><Download size={14} />Baixar</a></li>)}</ul>}
  </section>;
}
