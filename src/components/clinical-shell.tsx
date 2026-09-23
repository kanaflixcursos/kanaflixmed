"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, UsersRound, WalletCards, HeartPulse, LogOut, Menu, X, ArrowUpRight, Stethoscope, LayoutDashboard, UserRound, Settings, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const sections = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/patients", label: "Pacientes", icon: UsersRound },
  { href: "/financeiro", label: "Financeiro", icon: WalletCards },
];

export function ClinicalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const internal = sections.some(({ href }) => pathname.startsWith(href)) || pathname.startsWith("/perfil") || pathname.startsWith("/configuracoes/clinica");
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({ name: "Sua conta", clinic: "Sua clínica", role: "" });
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!internal) return;
    let cancelled = false;
    async function load() {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await client.from("memberships").select("display_name, role, organizations(name)").eq("user_id", user.id).eq("status", "ACTIVE").order("created_at", { ascending: true }).limit(1);
      const relation = data?.[0]?.organizations;
      const organization = Array.isArray(relation) ? relation[0] : relation;
      if (!cancelled) setProfile({ name: data?.[0]?.display_name || user.user_metadata?.full_name || "Minha conta", clinic: organization?.name || "Sua clínica", role: data?.[0]?.role || "" });
    }
    void load().catch(() => undefined);
    window.addEventListener("clinic-profile-updated", load);
    return () => { cancelled = true; };
  }, [internal]);

  if (!internal) return <div className="public-experience">{children}</div>;
  const current = sections.find(({ href }) => pathname.startsWith(href)) ?? (pathname.startsWith("/perfil") ? { label: "Meu perfil" } : pathname.startsWith("/configuracoes/clinica") ? { label: "Perfil da clínica" } : undefined);

  async function signOut() {
    setSigningOut(true);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setSigningOut(false);
    }
  }

  return <div className="clinical-app">
    <a href="#clinical-content" className="skip-link">Ir para o conteúdo</a>
    {open && <button className="sidebar-backdrop" aria-label="Fechar navegação" onClick={() => setOpen(false)} />}
    <aside className={`clinical-sidebar ${open ? "is-open" : ""}`}>
      <Link href="/dashboard" className="clinical-logo"><span className="logo-symbol"><HeartPulse size={24} /></span><span>Central Clínica<small>Cuidado em cada conexão</small></span></Link>
      <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
      <p className="nav-caption">GESTÃO DA CLÍNICA</p>
      <nav aria-label="Navegação principal">{sections.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname.startsWith(href) ? "active" : ""} aria-current={pathname.startsWith(href) ? "page" : undefined}><Icon size={20} strokeWidth={1.7} />{label}{pathname.startsWith(href) && <span className="nav-dot" />}</Link>)}</nav>
      <div className="sidebar-care"><Stethoscope size={40} strokeWidth={1.3} /><h2>Mais tempo<br />para cuidar.</h2><p>Uma rotina conectada, do primeiro contato ao atendimento.</p><Link href="/agenda">Organizar agenda <ArrowUpRight size={16} /></Link></div>
      {profile.role === "ADMIN" ? <Link href="/configuracoes/clinica" className="sidebar-clinic"><span className="clinic-avatar"><HeartPulse size={19} /></span><span>{profile.clinic}<small>Perfil da clínica</small></span><Settings className="ml-auto" size={15} /></Link> : <div className="sidebar-clinic"><span className="clinic-avatar"><HeartPulse size={19} /></span><span>{profile.clinic}<small>Ambiente da equipe</small></span></div>}
    </aside>
    <div className="clinical-workspace">
      <header className="clinical-topbar"><div className="topbar-context"><button className="mobile-menu" onClick={() => setOpen(true)} aria-expanded={open} aria-label="Abrir menu"><Menu size={22} /></button><span>Central Clínica <span className="breadcrumb-divider">/</span> <strong>{current?.label}</strong></span></div><details className="account-menu"><summary className="account-area"><span className="account-avatar">{profile.name.slice(0, 1).toUpperCase()}</span><span className="account-name">{profile.name}<small>Área profissional</small></span><ChevronDown size={16} className="account-chevron" /></summary><div className="account-menu-panel"><Link href="/perfil"><UserRound size={16} />Meu perfil</Link>{profile.role === "ADMIN" ? <Link href="/configuracoes/clinica"><Settings size={16} />Perfil da clínica</Link> : null}<button disabled={signingOut} onClick={() => void signOut()}><LogOut size={16} />{signingOut ? "Saindo…" : "Sair da conta"}</button>{error ? <p role="alert">{error}</p> : null}</div></details></header>
      {error && <p role="alert" className="mx-6 mt-4 text-sm text-danger">{error}</p>}
      <div id="clinical-content" className="clinical-content">{children}</div>
    </div>
  </div>;
}
