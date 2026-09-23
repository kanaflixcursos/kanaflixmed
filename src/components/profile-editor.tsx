"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Check, UserRound } from "lucide-react";

type Mode = "professional" | "clinic";
type ProfileValues = { displayName: string; professionalTitle: string; councilType: string; councilNumber: string; councilState: string; email: string };
type ClinicValues = { name: string; slug: string; timezone: string; phone: string; contactEmail: string; address: string };
const emptyProfile: ProfileValues = { displayName: "", professionalTitle: "", councilType: "", councilNumber: "", councilState: "", email: "" };
const emptyClinic: ClinicValues = { name: "", slug: "", timezone: "America/Sao_Paulo", phone: "", contactEmail: "", address: "" };
const timezones = ["America/Sao_Paulo", "America/Manaus", "America/Belem", "America/Fortaleza", "America/Recife", "America/Rio_Branco", "America/Noronha", "America/Bahia", "America/Cuiaba", "America/Campo_Grande", "America/Porto_Velho", "America/Boa_Vista", "America/Maceio", "America/Araguaina", "America/Santarem"];

function ProfileField({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; readOnly?: boolean; maxLength?: number; placeholder?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm" {...props} /></label>;
}

export function ProfileEditor({ mode }: { mode: Mode }) {
  const clinicMode = mode === "clinic";
  const [profile, setProfile] = useState<ProfileValues>(emptyProfile);
  const [clinic, setClinic] = useState<ClinicValues>(emptyClinic);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(clinicMode ? "/api/clinic" : "/api/me", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error === "CLINIC_FORBIDDEN" ? "Somente um administrador pode editar os dados da clínica." : "Não foi possível carregar os dados.");
        if (!active) return;
        if (clinicMode) setClinic({ ...emptyClinic, ...payload.clinic, contactEmail: payload.clinic.contact_email ?? "" });
        else setProfile({ ...emptyProfile, displayName: payload.profile.display_name ?? "", professionalTitle: payload.profile.professional_title ?? "", councilType: payload.profile.council_type ?? "", councilNumber: payload.profile.council_number ?? "", councilState: payload.profile.council_state ?? "", email: payload.profile.email ?? "" });
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os dados."); }
      finally { if (active) setLoading(false); }
    }
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [clinicMode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(clinicMode ? "/api/clinic" : "/api/me", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clinicMode ? { name: clinic.name, timezone: clinic.timezone, phone: clinic.phone, contactEmail: clinic.contactEmail, address: clinic.address } : profile),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "INVALID_TIMEZONE" ? "Selecione um fuso horário válido." : payload.error === "CLINIC_FORBIDDEN" ? "Somente o administrador pode salvar o perfil da clínica." : "Não foi possível salvar as alterações.");
      setNotice("Alterações salvas.");
      if (clinicMode) setClinic((current) => ({ ...current, ...payload.clinic, contactEmail: payload.clinic.contact_email ?? "" }));
      window.dispatchEvent(new Event("clinic-profile-updated"));
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar as alterações."); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-10"><div className="mx-auto max-w-3xl"><Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"><ArrowLeft size={16} />Voltar ao dashboard</Link><header className="border-b border-border pb-6"><p className="text-sm font-medium text-brand">Configurações</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em]">{clinicMode ? "Perfil da clínica" : "Meu perfil"}</h1><p className="mt-2 text-sm text-muted-foreground">{clinicMode ? "Mantenha os dados e o fuso horário da clínica atualizados." : "Atualize seus dados profissionais exibidos na plataforma."}</p></header>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p> : null}{notice ? <p role="status" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success"><Check size={16} />{notice}</p> : null}
    {loading ? <div className="mt-6 rounded-3xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">Carregando dados…</div> : <form onSubmit={submit} className="mt-6 space-y-5 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">{clinicMode ? <>
      <div className="flex items-center gap-3 border-b border-border pb-4"><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Building2 size={19} /></span><div><h2 className="font-medium">Identificação e contato</h2><p className="text-xs text-muted-foreground">Esses dados ajudam sua equipe a reconhecer o ambiente.</p></div></div>
      <ProfileField label="Nome da clínica" required maxLength={120} value={clinic.name} onChange={(value) => setClinic({ ...clinic, name: value })} />
      <ProfileField label="Identificador" readOnly value={clinic.slug} onChange={() => undefined} />
      <label className="block"><span className="mb-2 block text-sm font-medium">Fuso horário</span><select value={clinic.timezone} onChange={(event) => setClinic({ ...clinic, timezone: event.target.value })} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">{[...new Set([...timezones, clinic.timezone])].map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><ProfileField label="Telefone" value={clinic.phone} onChange={(value) => setClinic({ ...clinic, phone: value })} type="tel" maxLength={40} /><ProfileField label="E-mail de contato" value={clinic.contactEmail} onChange={(value) => setClinic({ ...clinic, contactEmail: value })} type="email" maxLength={254} /></div>
      <ProfileField label="Endereço" value={clinic.address} onChange={(value) => setClinic({ ...clinic, address: value })} maxLength={300} />
    </> : <>
      <div className="flex items-center gap-3 border-b border-border pb-4"><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><UserRound size={19} /></span><div><h2 className="font-medium">Dados profissionais</h2><p className="text-xs text-muted-foreground">Seu nome aparece no cabeçalho e nos atendimentos.</p></div></div>
      <ProfileField label="Nome de exibição" required maxLength={120} value={profile.displayName} onChange={(value) => setProfile({ ...profile, displayName: value })} />
      <ProfileField label="Título profissional" maxLength={120} value={profile.professionalTitle} onChange={(value) => setProfile({ ...profile, professionalTitle: value })} placeholder="Ex.: Médica · Cardiologia" />
      <div className="grid gap-4 sm:grid-cols-3"><ProfileField label="Conselho" maxLength={40} value={profile.councilType} onChange={(value) => setProfile({ ...profile, councilType: value })} placeholder="CRM" /><ProfileField label="Número" maxLength={60} value={profile.councilNumber} onChange={(value) => setProfile({ ...profile, councilNumber: value })} /><ProfileField label="UF" maxLength={2} value={profile.councilState} onChange={(value) => setProfile({ ...profile, councilState: value.toUpperCase().slice(0, 2) })} placeholder="SP" /></div>
      <ProfileField label="E-mail de acesso" readOnly type="email" value={profile.email} onChange={() => undefined} />
    </>}
      <div className="flex justify-end border-t border-border pt-4"><button disabled={saving} className="h-11 rounded-xl bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">{saving ? "Salvando…" : "Salvar alterações"}</button></div>
    </form>}
  </div></main>;
}
