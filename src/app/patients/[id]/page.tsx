"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, Mail, Phone, UserRound } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Patient = {
  id: string;
  record_number: number;
  display_name: string;
  legal_name: string | null;
  birth_date: string | null;
  phone_e164: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  operationalNote: string | null;
  priceCents: number;
  serviceName: string;
};

const appointmentStatus: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CHECKED_IN: "Check-in",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
  CANCELLED: "Cancelado",
};

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function PatientDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatient() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/patients/${params.id}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error === "AUTH_REQUIRED" ? "Entre na sua conta para acessar este paciente." : payload.error === "PATIENT_NOT_FOUND" ? "Paciente não encontrado." : "Não foi possível carregar o paciente.");
        }
        setPatient(payload.patient);
        setAppointments(payload.appointments ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o paciente.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPatient();
  }, [params.id]);

  if (isLoading) return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-5xl text-sm text-muted-foreground">Carregando paciente...</div></main>;

  if (error || !patient) return <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mx-auto max-w-5xl"><button className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground" onClick={() => router.push("/patients")}><ArrowLeft size={16} />Voltar para pacientes</button><div className="rounded-3xl border border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">{error ?? "Paciente não encontrado."}</div></div></main>;

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <Link className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground" href="/patients"><ArrowLeft size={16} />Voltar para pacientes</Link>

        <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><UserRound size={25} /></span>
            <div>
              <p className="text-sm font-medium text-brand">Prontuário #{patient.record_number}</p>
              <h1 className="mt-1 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">{patient.display_name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{patient.active ? "Cadastro ativo" : "Cadastro inativo"}</p>
            </div>
          </div>
          <Link className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium transition hover:border-brand hover:text-brand" href="/patients">Editar na lista</Link>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-medium">Dados do paciente</h2>
            <dl className="mt-6 space-y-5 text-sm">
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nome completo</dt><dd className="mt-1">{patient.legal_name || "Não informado"}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nascimento</dt><dd className="mt-1 inline-flex items-center gap-2"><CalendarDays size={15} className="text-muted-foreground" />{formatDate(patient.birth_date)}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Telefone</dt><dd className="mt-1 inline-flex items-center gap-2"><Phone size={15} className="text-muted-foreground" />{patient.phone_e164 || "Não informado"}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">E-mail</dt><dd className="mt-1 inline-flex items-center gap-2"><Mail size={15} className="text-muted-foreground" />{patient.email || "Não informado"}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Observações administrativas</dt><dd className="mt-1 whitespace-pre-wrap leading-6">{patient.notes || "Nenhuma observação registrada."}</dd></div>
            </dl>
          </article>

          <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-medium">Histórico de agenda</h2><p className="mt-1 text-sm text-muted-foreground">Últimos vínculos operacionais deste paciente.</p></div><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">{appointments.length} registro{appointments.length === 1 ? "" : "s"}</span></div>
            {appointments.length === 0 ? <div className="mt-10 flex flex-col items-center px-4 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted-foreground"><Clock3 size={20} /></span><p className="mt-4 text-sm font-medium">Nenhum agendamento vinculado</p><p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">Quando a agenda for usada para este paciente, o histórico aparecerá aqui.</p></div> : <div className="mt-6 divide-y divide-border">{appointments.map((appointment) => <div className="flex gap-3 py-4 first:pt-0 last:pb-0" key={appointment.id}><span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><CalendarDays size={15} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{appointment.serviceName}</p><span className="text-xs font-medium text-muted-foreground">{appointmentStatus[appointment.status] ?? appointment.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(appointment.startsAt)} · {formatCurrency(appointment.priceCents)}</p>{appointment.operationalNote ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{appointment.operationalNote}</p> : null}</div></div>)}</div>}
          </article>
        </section>
      </div>
    </main>
  );
}
