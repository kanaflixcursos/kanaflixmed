"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const defaultError = "Não foi possível entrar. Confira os dados e tente novamente.";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error: authError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message.toLowerCase().includes("invalid") ? defaultError : authError.message);
      setIsLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setError(null);
    setIsLoading(true);
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(23,23,22,0.08)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#171716] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--brand)]/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#4d7cff]/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand)] text-lg font-semibold">KM</span>
              <span className="text-lg font-semibold tracking-[-0.03em]">Kanaflix MED</span>
            </div>
            <p className="mt-24 max-w-md text-4xl font-medium leading-[1.05] tracking-[-0.06em] xl:text-5xl">
              Menos operação. Mais cuidado com cada paciente.
            </p>
            <p className="mt-6 max-w-sm text-base leading-7 text-white/60">
              A rotina da clínica, do agendamento ao recebimento, em um só lugar.
            </p>
          </div>
          <div className="relative flex items-center gap-3 text-sm text-white/60">
            <ShieldCheck className="size-4 text-[var(--brand)]" />
            Ambiente protegido para sua equipe
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand)] text-lg font-semibold text-white">KM</span>
                <span className="text-lg font-semibold tracking-[-0.03em]">Kanaflix MED</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--brand)]">Área da clínica</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Bem-vindo de volta</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">Entre para acompanhar a operação da sua clínica.</p>
            </div>

            <button className="mt-9 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="button" onClick={handleGoogleLogin}>
              <span className="grid size-5 place-items-center rounded-full text-base font-bold">G</span>
              Continuar com Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-[var(--muted-foreground)]"><span className="h-px flex-1 bg-[var(--border)]" /><span>ou entre com e-mail</span><span className="h-px flex-1 bg-[var(--border)]" /></div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">E-mail profissional</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-11 pr-4 text-sm transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--brand)] focus:bg-[var(--surface)] focus:outline-none"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@clinica.com.br"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Senha</span>
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-11 pr-12 text-sm transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--brand)] focus:bg-[var(--surface)] focus:outline-none"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>

              {error ? <p className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 text-sm leading-5 text-[var(--danger)]">{error}</p> : null}

              <button className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="submit">
                {isLoading ? "Entrando..." : "Entrar na plataforma"}
                {!isLoading ? <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /> : null}
              </button>
            </form>

            <p className="mt-8 text-center text-xs leading-5 text-[var(--muted-foreground)]">
              Ainda não tem uma conta? <Link className="font-medium text-[var(--brand)] hover:underline" href="/register">Criar cadastro</Link>
            </p>
            <p className="mt-3 text-center text-xs leading-5 text-[var(--muted-foreground)]">
              Primeiro acesso? <Link className="font-medium text-[var(--brand)] hover:underline" href="/onboarding">Configure sua clínica</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
