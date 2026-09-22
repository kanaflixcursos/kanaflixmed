"use client";

import Link from "next/link";
import { CalendarDays, CircleDollarSign, Clock3, ReceiptText, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";


type FinanceEntry = {
  id: string;
  appointmentId: string | null;
  patientId: string | null;
  patientName: string;
  appointmentStartsAt: string | null;
  type: string;
  status: string;
  description: string;
  amountCents: number;
  paidCents: number;
  remainingCents: number;
  dueDate: string;
};

type Totals = { paidCents: number; openCents: number; overdueCents: number };

const statusLabels: Record<string, string> = { PENDING: "Pendente", PARTIAL: "Parcial", PAID: "Pago", OVERDUE: "Em atraso", CANCELLED: "Cancelado" };
const paymentMethods = [{ value: "PIX", label: "Pix" }, { value: "CASH", label: "Dinheiro" }, { value: "DEBIT_CARD", label: "Débito" }, { value: "CREDIT_CARD", label: "Crédito" }, { value: "TRANSFER", label: "Transferência" }, { value: "OTHER", label: "Outro" }];

function formatCurrency(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`)); }
function formatDateTime(value: string | null) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Sem agendamento"; }

export default function FinanceiroPage() {

  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ paidCents: 0, openCents: 0, overdueCents: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});
  const [processingEntryId, setProcessingEntryId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFinance() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/finance", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error === "AUTH_REQUIRED" ? "Entre na sua conta para acessar o financeiro." : payload.error === "FINANCE_FORBIDDEN" ? "Seu perfil não possui acesso ao financeiro." : "Não foi possível carregar o financeiro.");
        if (!cancelled) { setEntries(payload.entries ?? []); setTotals(payload.totals ?? { paidCents: 0, openCents: 0, overdueCents: 0 }); }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o financeiro.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadFinance();
    return () => { cancelled = true; };
  }, []);

  async function receiveEntry(entry: FinanceEntry) {
    if (entry.remainingCents <= 0 || processingEntryId) return;
    setProcessingEntryId(entry.id);
    setError(null);
    try {
      const response = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financialEntryId: entry.id,
          amountCents: entry.remainingCents,
          method: selectedMethods[entry.id] ?? "PIX",
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "PAYMENT_EXCEEDS_BALANCE" ? "Essa cobrança mudou. Atualize a página e tente novamente." : "Não foi possível registrar o recebimento.");
      window.location.reload();
    } catch (receiveError) {
      setError(receiveError instanceof Error ? receiveError.message : "Não foi possível registrar o recebimento.");
      setProcessingEntryId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-brand">Controle financeiro</p><h1 className="mt-2 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">Financeiro</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Acompanhe cobranças geradas pelos atendimentos concluídos.</p></div><Link className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition hover:border-brand hover:text-brand" href="/agenda"><CalendarDays size={16} />Ver agenda</Link></header>

        {error ? <div className="mt-6 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div> : null}
        <section className="mt-8 grid gap-4 sm:grid-cols-3"><article className="rounded-3xl border border-border bg-surface p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Em aberto</p><span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"><WalletCards size={18} /></span></div><p className="mt-5 text-3xl font-medium tracking-[-0.04em]">{formatCurrency(totals.openCents)}</p><p className="mt-2 text-xs text-muted-foreground">Pendentes, parciais e em atraso</p></article><article className="rounded-3xl border border-border bg-surface p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Recebido</p><span className="grid size-9 place-items-center rounded-xl bg-success/10 text-success"><CircleDollarSign size={18} /></span></div><p className="mt-5 text-3xl font-medium tracking-[-0.04em]">{formatCurrency(totals.paidCents)}</p><p className="mt-2 text-xs text-muted-foreground">Lançamentos marcados como pagos</p></article><article className="rounded-3xl border border-border bg-surface p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Em atraso</p><span className="grid size-9 place-items-center rounded-xl bg-warning/10 text-warning"><Clock3 size={18} /></span></div><p className="mt-5 text-3xl font-medium tracking-[-0.04em]">{formatCurrency(totals.overdueCents)}</p><p className="mt-2 text-xs text-muted-foreground">Requer acompanhamento</p></article></section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"><div className="border-b border-border p-5 sm:p-6"><h2 className="text-lg font-medium">Lançamentos recentes</h2><p className="mt-1 text-sm text-muted-foreground">Cada atendimento concluído com valor gera uma cobrança uma única vez.</p></div>{isLoading ? <div className="p-12 text-center text-sm text-muted-foreground">Carregando lançamentos...</div> : entries.length === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><ReceiptText size={24} /></span><h3 className="mt-5 text-lg font-medium">Nenhuma cobrança gerada</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Conclua um atendimento com valor definido no serviço para gerar a primeira cobrança.</p></div> : <div className="divide-y divide-border">{entries.map((entry) => <article className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:px-6" key={entry.id}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><ReceiptText size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link className="truncate text-sm font-medium transition hover:text-brand" href={entry.patientId ? `/patients/${entry.patientId}` : "/patients"}>{entry.patientName}</Link><span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium">{statusLabels[entry.status] ?? entry.status}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{entry.description} · Atendimento: {formatDateTime(entry.appointmentStartsAt)}</p></div><div className="text-left sm:text-right"><p className="text-sm font-semibold">{formatCurrency(entry.remainingCents)} <span className="text-xs font-normal text-muted-foreground">em aberto</span></p><p className="mt-1 text-xs text-muted-foreground">Total: {formatCurrency(entry.amountCents)} · Vencimento: {formatDate(entry.dueDate)}</p></div>{entry.remainingCents > 0 && entry.status !== "CANCELLED" ? <div className="flex items-center gap-2 sm:ml-2"><select aria-label={`Forma de pagamento de ${entry.patientName}`} className="h-9 rounded-xl border border-border bg-background px-2 text-xs" value={selectedMethods[entry.id] ?? "PIX"} onChange={(event) => setSelectedMethods((current) => ({ ...current, [entry.id]: event.target.value }))}>{paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select><button className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-medium text-white transition hover:bg-brand-hover disabled:opacity-60" disabled={processingEntryId === entry.id} onClick={() => void receiveEntry(entry)}>{processingEntryId === entry.id ? "Salvando" : "Receber"}</button></div> : null}</article>)}</div>}</section>
      </div>
    </main>
  );
}
