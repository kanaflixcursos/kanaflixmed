"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Building2, Check, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [clinicName, setClinicName] = useState("");
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  const [membershipCheckFailed, setMembershipCheckFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkMembership() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (userError) {
          setMembershipCheckFailed(true);
          setError("Não foi possível validar sua sessão. Atualize a página antes de continuar.");
          setIsCheckingMembership(false);
          return;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: memberships, error: membershipError } = await supabase
          .from("memberships")
          .select("organization_id")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .limit(1);

        if (!isMounted) return;
        if (membershipError) {
          setMembershipCheckFailed(true);
          setError("Não foi possível verificar se sua conta já tem uma clínica. Atualize a página antes de continuar.");
          setIsCheckingMembership(false);
          return;
        }

        if (memberships?.length) {
          router.replace("/agenda");
          router.refresh();
          return;
        }

        if (user.user_metadata?.full_name) setDisplayName((current) => current || user.user_metadata.full_name);
        setIsCheckingMembership(false);
      } catch {
        if (!isMounted) return;
        setMembershipCheckFailed(true);
        setError("Não foi possível verificar sua conta. Atualize a página antes de continuar.");
        setIsCheckingMembership(false);
      }
    }

    void checkMembership();
    return () => { isMounted = false; };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCheckingMembership || membershipCheckFailed) return;
    setError(null);
    setIsLoading(true);

    const { error: rpcError } = await createClient().rpc("create_organization", {
      org_name: clinicName,
      org_slug: slug,
      member_display_name: displayName,
    });

    if (rpcError) {
      const messages: Record<string, string> = {
        AUTH_REQUIRED: "Entre na sua conta antes de configurar a clínica.",
        INVALID_ORGANIZATION_NAME: "Informe um nome de clínica entre 2 e 120 caracteres.",
        INVALID_ORGANIZATION_SLUG: "Use um identificador com letras minúsculas, números e hífens.",
        ORGANIZATION_SLUG_TAKEN: "Este identificador já está em uso. Escolha outro para continuar.",
        INVALID_MEMBER_NAME: "Informe seu nome completo.",
      };
      setError(messages[rpcError.message] ?? "Não foi possível criar a clínica. Verifique os dados e tente novamente.");
      setIsLoading(false);
      return;
    }

    router.replace("/agenda");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)] text-sm font-semibold text-white">CC</span>
            <span className="text-lg font-semibold tracking-[-0.03em]">Central Clínica</span>
          </div>
          <span className="hidden items-center gap-2 text-xs text-[var(--muted-foreground)] sm:flex"><ShieldCheck className="size-4 text-[var(--success)]" /> Configuração segura</span>
        </header>

        <div className="mx-auto mt-16 max-w-xl">
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]"><Building2 className="size-6" /></span>
            <p className="mt-6 text-sm font-medium text-[var(--brand)]">Configuração inicial</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Configure sua clínica</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">Crie o ambiente que sua equipe vai usar para organizar agenda, pacientes e financeiro.</p>
          </div>

          <form className="mt-10 space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8" onSubmit={handleSubmit}>
            <label className="block"><span className="mb-2 block text-sm font-medium">Nome da clínica</span><span className="relative block"><Building2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-11 pr-4 text-sm focus:border-[var(--brand)] focus:bg-[var(--surface)] focus:outline-none" placeholder="Clínica Movimento" value={clinicName} onChange={(event) => { setClinicName(event.target.value); setSlug(slugify(event.target.value)); }} required /></span></label>
            <label className="block"><span className="mb-2 block text-sm font-medium">Identificador da clínica</span><input className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm focus:border-[var(--brand)] focus:bg-[var(--surface)] focus:outline-none" placeholder="clinica-movimento" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} required /><span className="mt-2 block text-xs text-[var(--muted-foreground)]">Será usado internamente para identificar seu workspace.</span></label>
            <label className="block"><span className="mb-2 block text-sm font-medium">Seu nome</span><span className="relative block"><UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-11 pr-4 text-sm focus:border-[var(--brand)] focus:bg-[var(--surface)] focus:outline-none" placeholder="Ana Ribeiro" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></span></label>
            {error ? <p className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 text-sm leading-5 text-[var(--danger)]">{error}</p> : null}
            <button className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading || isCheckingMembership || membershipCheckFailed} type="submit">{isCheckingMembership ? "Verificando sua clínica..." : isLoading ? "Criando clínica..." : "Concluir configuração"}{!isLoading && !isCheckingMembership ? <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /> : null}</button>
            <p className="flex items-center justify-center gap-2 pt-1 text-xs text-[var(--muted-foreground)]"><Check className="size-3.5 text-[var(--success)]" /> Você será definido como administrador</p>
          </form>
        </div>
      </div>
    </main>
  );
}
