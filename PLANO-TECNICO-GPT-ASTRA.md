# Kanaflix MED — Plano técnico de execução para GPT-6 Astra

**Versão:** 1.0  
**Data:** 16 de setembro de 2026  
**Status:** pronto para bootstrap do projeto  
**Objetivo:** permitir que um agente de código implemente o MVP com decisões técnicas, ordem de execução, contratos, verificações e limites claros.

## 1. Documentos e ordem de precedência

O agente executor deve ler estes documentos antes de alterar o repositório:

1. `C:\Users\rodri\OneDrive\Documentos\ChatGPT\Kanaflix MED\PLANO-TECNICO-GPT-ASTRA.md` — arquitetura e execução.
2. `C:\Users\rodri\OneDrive\Documentos\ChatGPT\Kanaflix MED\PLANEJAMENTO-KANAFLIX-MED.md` — produto, escopo e fluxos.
3. `C:\Users\rodri\OneDrive\Desktop\DESIGN.md` — fonte da verdade visual.

Em caso de conflito:

- segurança, isolamento de dados e integridade clínica deste plano prevalecem;
- escopo funcional vem do planejamento de produto;
- aparência, componentes, espaçamento e comportamento visual vêm do `DESIGN.md`;
- mudanças de arquitetura exigem registro em `docs/adr/` antes da implementação.

Não interpretar exemplos dos documentos como autorização para ampliar o escopo. TISS, estoque, telemedicina, NFS-e, assinatura ICP-Brasil, portal do paciente, app nativo, WhatsApp automatizado e IA continuam fora do MVP.

---

## 2. Resultado esperado

Entregar uma aplicação web responsiva em português do Brasil para clínicas ambulatoriais privadas, cobrindo:

- autenticação e clínica isolada por workspace;
- equipe, papéis e permissões;
- profissionais, serviços e disponibilidade;
- pacientes e prevenção de duplicidade;
- agenda e operação diária em “Hoje”;
- atendimento, prontuário, finalização e adendo;
- cobranças, pagamentos, despesas e caixa simples;
- visão geral e relatórios essenciais;
- auditoria, exportação controlada e anexos privados.

O caminho crítico do produto é:

```text
Agendar → Confirmar → Check-in → Atender → Finalizar → Receber → Acompanhar
```

---

## 3. Premissas executáveis

Estas premissas permitem começar sem novas decisões. Devem ser registradas no README e podem ser revistas antes do piloto:

| Tema | Premissa do MVP |
| --- | --- |
| Público | Clínicas médicas e consultórios particulares |
| Profissionais | Vários profissionais por clínica |
| Unidades | Modelo suporta várias; interface opera uma unidade principal |
| Convênios | Fora do MVP |
| Pagamento na recepção | Permitido por padrão |
| Acesso clínico | Somente profissional autorizado; administrador não herda acesso clínico |
| Compartilhamento clínico | Negado por padrão; concessão explícita futura |
| Documentos | PDF para impressão, sem assinatura digital interoperável |
| Importação | Fora do primeiro ciclo |
| Identidade | Kanaflix MED com logo e cor da clínica no workspace |
| Idioma e fuso | `pt-BR`; fuso padrão `America/Sao_Paulo`, configurável por clínica |
| Moeda | BRL; valores persistidos em centavos inteiros |

### Gates que bloqueiam apenas o piloto com dados reais

- revisão jurídica e de privacidade;
- seleção definitiva de provedores de produção;
- política de retenção;
- contrato com suboperadores;
- teste de restauração de backup;
- pentest e correções críticas;
- validação do escopo profissional e dos documentos clínicos.

Esses gates não impedem o desenvolvimento com dados sintéticos.

---

## 4. Decisões técnicas

### 4.1 Arquitetura

Usar um **monólito modular**. Interface, aplicação e backend ficam no mesmo projeto Next.js, mas regras de domínio não ficam dentro de componentes, Server Actions ou Route Handlers.

Razões:

- transações entre agenda, prontuário e financeiro são frequentes;
- um único deploy reduz complexidade operacional do MVP;
- módulos bem separados permitem extrair serviços no futuro, se houver evidência real;
- isolamento entre clínicas é mais fácil de testar de forma centralizada.

### 4.2 Stack base

| Camada | Escolha |
| --- | --- |
| Runtime | Node.js LTS compatível com Next.js 16.2 |
| Gerenciador | pnpm com lockfile versionado |
| Framework | Next.js 16.2, App Router |
| UI | React 19.2, TypeScript estrito |
| Estilo | Tailwind CSS 4 e tokens do `DESIGN.md` |
| Primitivos acessíveis | Radix UI somente onde necessário |
| Ícones | Lucide React |
| Movimento | Framer Motion, apenas regras do `DESIGN.md` |
| Formulários | React Hook Form + Zod |
| Banco | PostgreSQL 16 ou superior via Supabase |
| Data access | Supabase JS + migrations SQL versionadas no MVP |
| Autenticação | Better Auth, adaptador PostgreSQL e sessões em banco |
| Jobs | pg-boss ou equivalente baseado em PostgreSQL |
| Objetos | API compatível com S3; MinIO no desenvolvimento |
| E-mail local | Mailpit |
| PDF | `@react-pdf/renderer`, sem navegador headless no fluxo comum |
| Testes unitários | Vitest |
| Testes de componentes | Testing Library |
| Testes E2E | Playwright |
| Testes de banco | PostgreSQL real isolado, preferencialmente Testcontainers |
| Logs | Pino com redaction |
| Observabilidade | OpenTelemetry; destino definido por ambiente |

O agente deve verificar as versões estáveis compatíveis no bootstrap. Não trocar as tecnologias acima sem ADR. Nunca implementar autenticação, hashing, criptografia ou assinatura digital manualmente.

### 4.3 Estratégia de renderização

- Server Components para leitura e composição de páginas.
- Client Components apenas para calendário, formulários interativos, autosave e filtros instantâneos.
- Server Actions para comandos originados por formulários internos.
- Route Handlers para upload, download, exportação, busca assíncrona e integrações futuras.
- Serviços de aplicação são a única porta para mutações de domínio.
- Toda entrada é validada no servidor com Zod, mesmo quando já validada no cliente.

### 4.4 Datas e valores

- Persistir instantes como `timestamptz` em UTC.
- Persistir datas civis, como nascimento e vencimento, como `date`.
- Converter agenda usando o fuso da organização.
- Persistir dinheiro em `bigint` de centavos; nunca usar `float`.
- Formatar moeda e datas apenas na borda da interface.

---

## 5. Estrutura do repositório

```text
/
├── docs/
│   ├── adr/
│   ├── architecture/
│   ├── runbooks/
│   └── threat-model/
├── supabase/
│   └── migrations/
├── public/
│   ├── brand/
│   └── auth/
├── scripts/
│   ├── seed.ts
│   ├── create-test-org.ts
│   └── verify-rls.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (app)/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── feedback/
│   ├── modules/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── team/
│   │   ├── patients/
│   │   ├── scheduling/
│   │   ├── encounters/
│   │   ├── finance/
│   │   ├── reports/
│   │   ├── files/
│   │   └── audit/
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema/
│   │   ├── tenant-context.ts
│   │   └── types.ts
│   ├── lib/
│   │   ├── auth/
│   │   ├── env/
│   │   ├── logger/
│   │   ├── money/
│   │   ├── time/
│   │   └── validation/
│   └── test/
│       ├── factories/
│       ├── fixtures/
│       └── setup/
├── tests/
│   ├── integration/
│   ├── e2e/
│   ├── security/
│   └── visual/
├── .env.example
├── docker-compose.yml
├── next.config.ts
├── package.json
├── playwright.config.ts
└── README.md
```

### Estrutura interna de cada módulo

```text
modules/patients/
├── domain/
│   ├── entities.ts
│   ├── policies.ts
│   └── errors.ts
├── application/
│   ├── commands/
│   ├── queries/
│   └── dto.ts
├── infrastructure/
│   ├── repository.ts
│   └── mappers.ts
└── ui/
    ├── actions.ts
    ├── components/
    └── schemas.ts
```

Dependências permitidas:

```text
ui → application → domain
infrastructure → application/domain
app routes → ui/application
```

O domínio não importa React, Next.js, Supabase ou provedores externos.

---

## 6. Contexto de requisição e multitenancy

### 6.1 Regra central

O `organization_id` nunca vem de um campo confiável do navegador. Ele é derivado da sessão e da associação ativa do usuário.

### 6.2 Contexto autenticado

```ts
type RequestContext = {
  requestId: string;
  userId: string;
  organizationId: string;
  membershipId: string;
  role: Role;
  permissions: Permission[];
  professionalId?: string;
  timezone: string;
};
```

Toda operação protegida recebe `RequestContext` resolvido no servidor.

### 6.3 Row-Level Security

Implementar RLS como defesa adicional, não como substituto da autorização da aplicação.

- Habilitar RLS em toda tabela com `organization_id`.
- Antes da consulta, abrir transação e executar `set_config('app.organization_id', ..., true)` e `set_config('app.user_id', ..., true)`.
- Políticas comparam `organization_id` ao valor da sessão PostgreSQL.
- Consultas globais de autenticação ficam em tabelas explicitamente separadas e com acesso mínimo.
- Jobs também executam dentro de contexto de organização.
- Nenhum repositório aceita `organizationId` arbitrário vindo de DTO de usuário.
- Toda consulta SQL crua passa por helper de contexto e revisão.

### 6.4 Teste obrigatório

Para cada módulo com dados de negócio, criar teste que:

1. insere registros nas organizações A e B;
2. autentica contexto da organização A;
3. tenta ler, alterar e excluir o identificador da organização B;
4. comprova zero linhas retornadas ou erro de autorização;
5. repete por Route Handler/Server Action para impedir IDOR.

Falha de isolamento bloqueia merge e deploy.

---

## 7. Autenticação, sessão e autorização

### 7.1 Autenticação

- E-mail e senha com verificação de e-mail.
- Recuperação de senha com token de uso único e expiração curta.
- Convite de equipe com token de uso único.
- Sessão em cookie `HttpOnly`, `Secure` em produção e `SameSite=Lax`.
- Rotação/revogação de sessão conforme suporte do provedor.
- MFA TOTP obrigatório para administradores e profissionais antes do piloto real.
- Rate limit para login, recuperação, convite e verificação.
- Mensagens de autenticação não confirmam se um e-mail existe.

### 7.2 Papéis

```ts
type Role = 'ADMIN' | 'PROFESSIONAL' | 'RECEPTION' | 'FINANCE';
```

### 7.3 Capacidades

Não espalhar condicionais de papel pela aplicação. Mapear papéis para capacidades:

```text
organization.read
organization.manage
team.read
team.manage
schedule.read.all
schedule.read.own
schedule.write
patient.read
patient.write
clinical.read
clinical.write
clinical.finalize
finance.read
finance.write
report.operational.read
report.financial.read
audit.read
```

Regras adicionais:

- `clinical.read` exige também vínculo profissional permitido ao paciente/atendimento.
- `ADMIN` não recebe `clinical.read` automaticamente.
- dados financeiros do paciente são ocultados quando o usuário não possui `finance.read`.
- esconder elemento na UI não substitui checagem no comando ou query.

### 7.4 Função canônica

```ts
authorize(context, permission, resource?)
```

Ela deve falhar com erro tipado, gerar evento de segurança quando apropriado e nunca registrar o conteúdo clínico solicitado.

---

## 8. Modelo de dados físico

Todos os identificadores públicos usam UUID aleatório. Todas as tabelas relevantes têm `created_at`, `updated_at` e, quando aplicável, `created_by`/`updated_by`.

### 8.1 Identidade e organizações

#### `users`

- `id uuid pk`
- `email citext unique not null`
- `name text not null`
- `email_verified_at timestamptz null`
- campos administrados pelo adaptador de autenticação

#### `organizations`

- `id uuid pk`
- `name text not null`
- `slug citext unique not null`
- `brand_color char(7) not null default '#FE6731'`
- `timezone text not null default 'America/Sao_Paulo'`
- `status text not null`
- `settings jsonb not null default '{}'`

#### `locations`

- `id`, `organization_id`
- `name`, `timezone`
- endereço estruturado
- `is_primary boolean`
- `active boolean`

#### `memberships`

- `id`, `organization_id`, `user_id`
- `role`
- `status`: `INVITED`, `ACTIVE`, `SUSPENDED`
- `invited_at`, `accepted_at`, `last_access_at`
- unique `(organization_id, user_id)`

#### `professional_profiles`

- `id`, `organization_id`, `user_id`
- `display_name`, `council_type`, `council_number`, `council_state`
- `specialty text null`
- `active boolean`
- unique parcial por usuário ativo na organização

### 8.2 Configuração operacional

#### `services`

- `id`, `organization_id`
- `name`
- `duration_minutes integer check > 0`
- `price_cents bigint check >= 0`
- `color_token text null`
- `active boolean`

#### `rooms`

- `id`, `organization_id`, `location_id`
- `name`, `active`

#### `schedule_rules`

- `id`, `organization_id`, `professional_id`, `location_id`
- `weekday smallint check between 0 and 6`
- `start_local time`, `end_local time`
- `valid_from date`, `valid_until date null`

#### `schedule_blocks`

- `id`, `organization_id`, `professional_id`, `location_id`
- `starts_at`, `ends_at`, `reason`
- check `ends_at > starts_at`

### 8.3 Pacientes

#### `patients`

- `id`, `organization_id`
- `record_number bigint` gerado por organização, apenas para exibição
- `display_name`, `legal_name null`, `social_name null`
- `birth_date date null`
- `cpf_ciphertext bytea null`
- `cpf_hash bytea null` para igualdade/deduplicação
- `phone_e164 text null`, `email citext null`
- endereço estruturado
- `sex_at_birth text null`
- `gender_identity text null`
- `active boolean`
- `search_name text` normalizado
- índice trigram em `search_name`
- índice em `phone_e164`
- unique parcial `(organization_id, cpf_hash)` quando CPF existir

Não registrar CPF puro em log, evento analítico ou auditoria. A estratégia de criptografia e rotação deve constar em ADR antes da implementação do campo.

#### `patient_contacts`

- `id`, `organization_id`, `patient_id`
- `type`: `RESPONSIBLE`, `EMERGENCY`, `OTHER`
- `name`, `relationship`, `phone_e164`, `email`
- `is_legal_responsible`

#### `patient_alerts`

- `id`, `organization_id`, `patient_id`
- `scope`: `ADMINISTRATIVE`, `CLINICAL`
- `text`, `active`, `created_by`
- alertas clínicos seguem autorização clínica

#### `patient_files`

- `id`, `organization_id`, `patient_id`
- `object_key`, `original_name`, `mime_type`, `size_bytes`, `sha256`
- `category`, `status`: `PENDING_SCAN`, `AVAILABLE`, `QUARANTINED`
- `uploaded_by`, `uploaded_at`

#### `consent_records`

- `id`, `organization_id`, `patient_id`
- `purpose_code`, `version`, `status`
- `captured_at`, `revoked_at null`, `evidence jsonb`

### 8.4 Agenda

#### `appointments`

- `id`, `organization_id`, `location_id`
- `patient_id`, `professional_id`, `service_id`, `room_id null`
- `starts_at`, `ends_at`
- `status`
- `source`: `INTERNAL`, `WAITLIST`
- `operational_note text null`
- `price_cents bigint`
- `version integer not null default 1`
- check `ends_at > starts_at`
- índices por `(organization_id, starts_at)`, profissional e paciente

Adicionar restrição de exclusão PostgreSQL para impedir sobreposição de horários do mesmo profissional em agendamentos não cancelados. Conflito de sala segue a mesma lógica quando `room_id` não for nulo.

#### `appointment_status_events`

- `id`, `organization_id`, `appointment_id`
- `from_status null`, `to_status`
- `reason_code null`, `note null`
- `actor_user_id`, `occurred_at`

#### `waitlist_entries`

- `id`, `organization_id`, `patient_id`
- `professional_id null`, `service_id null`
- janela de datas e preferências em campos estruturados
- `status`

### 8.5 Atendimento clínico

#### `encounters`

- `id`, `organization_id`, `appointment_id unique null`
- `patient_id`, `professional_id`
- `status`: `DRAFT`, `FINALIZED`
- `started_at`, `finalized_at null`
- `version integer not null default 1`
- `finalized_by null`

#### `encounter_notes`

- `id`, `organization_id`, `encounter_id unique`
- `chief_complaint text null`
- `history text null`
- `medical_history text null`
- `allergies text null`
- `physical_exam text null`
- `assessment text null`
- `plan text null`
- `additional_notes text null`
- `updated_by`, `updated_at`

#### `vital_signs`

- `id`, `organization_id`, `encounter_id`
- campos numéricos opcionais para peso, altura, temperatura, pressão, pulso e saturação
- `measured_at`, `recorded_by`

#### `diagnoses`

- `id`, `organization_id`, `encounter_id`
- `code_system text null`, `code text null`, `description text`
- `kind`: `HYPOTHESIS`, `CONFIRMED`

#### `encounter_addenda`

- `id`, `organization_id`, `encounter_id`
- `text not null`, `reason not null`
- `author_user_id`, `created_at`
- sem update e sem delete pela aplicação

#### `clinical_documents`

- `id`, `organization_id`, `encounter_id`, `patient_id`
- `type`: `PRESCRIPTION_PRINT`, `CERTIFICATE`, `DECLARATION`, `EXAM_REQUEST`
- `content_snapshot jsonb`
- `object_key`
- `generated_by`, `generated_at`
- `status`: `DRAFT`, `GENERATED`, `VOIDED`

### 8.6 Financeiro

#### `financial_categories`

- `id`, `organization_id`
- `type`: `INCOME`, `EXPENSE`
- `name`, `active`

#### `financial_entries`

- `id`, `organization_id`
- `type`: `RECEIVABLE`, `PAYABLE`
- `patient_id null`, `appointment_id null`, `professional_id null`
- `category_id`, `description`
- `amount_cents bigint check > 0`
- `due_date date`
- `status`: `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`
- `created_by`
- unique parcial para cobrança automática por agendamento

#### `payments`

- `id`, `organization_id`, `financial_entry_id`
- `amount_cents bigint check > 0`
- `method`: `CASH`, `PIX`, `DEBIT_CARD`, `CREDIT_CARD`, `TRANSFER`, `OTHER`
- `paid_at`, `recorded_by`
- `idempotency_key text`
- `reversed_payment_id null`, `reversal_reason null`
- unique `(organization_id, idempotency_key)`

#### `cash_sessions`

- `id`, `organization_id`, `location_id`
- `opened_by`, `opened_at`, `closed_by null`, `closed_at null`
- `opening_cents`, `declared_closing_cents null`
- `status`: `OPEN`, `CLOSED`

### 8.7 Auditoria e jobs

#### `audit_events`

- `id uuid`, `organization_id`, `actor_user_id null`
- `action`, `resource_type`, `resource_id null`
- `result`: `SUCCESS`, `DENIED`, `FAILED`
- `request_id`, `occurred_at`
- `metadata jsonb` estritamente minimizado
- partição mensal quando volume justificar

Não armazenar texto de prontuário, senha, token, CPF, conteúdo de arquivo ou snapshot completo em auditoria.

#### `outbox_events`

- `id`, `organization_id`
- `event_type`, `aggregate_type`, `aggregate_id`
- `payload jsonb` minimizado
- `created_at`, `processed_at null`, `attempts`

Usar outbox transacional para jobs derivados de mutações importantes.

---

## 9. Máquinas de estado e invariantes

### 9.1 Agendamento

```text
SCHEDULED → CONFIRMED | CHECKED_IN | CANCELLED | NO_SHOW
CONFIRMED → CHECKED_IN | CANCELLED | NO_SHOW
CHECKED_IN → IN_PROGRESS | CANCELLED
IN_PROGRESS → COMPLETED
COMPLETED, CANCELLED, NO_SHOW → terminais
```

- Reagendamento altera horário, incrementa versão e grava evento; não apaga o agendamento.
- Toda transição registra autor, horário e motivo quando aplicável.
- Iniciar atendimento cria ou reutiliza um único `encounter`.
- Concluir atendimento e finalizar prontuário são operações relacionadas, mas não implicitamente idênticas sem comando explícito.

### 9.2 Prontuário

```text
DRAFT → FINALIZED
FINALIZED → somente ADDENDUM
```

- Autosave aceita somente `DRAFT`.
- Finalização ocorre em transação e registra snapshot/hashes necessários.
- Depois de `FINALIZED`, bloquear update e delete por serviço e trigger no banco.
- Adendo é append-only.
- Usar controle otimista por `version`; conflito retorna estado atual sem sobrescrever silenciosamente.

### 9.3 Financeiro

```text
PENDING → PARTIAL | PAID | CANCELLED | OVERDUE
PARTIAL → PAID | CANCELLED | OVERDUE
OVERDUE → PARTIAL | PAID | CANCELLED
```

- Status é derivado do total pago, vencimento e cancelamento; não pode divergir dos pagamentos.
- Pagamento não é editado ou excluído; correção cria reversão vinculada.
- Comando de pagamento é idempotente.
- Soma válida de pagamentos não pode exceder o valor sem regra explícita de crédito, que está fora do MVP.

---

## 10. Contratos da camada de aplicação

Os nomes abaixo são canônicos. Implementações podem ser funções ou classes, mantendo DTOs e regras.

### 10.1 Pacientes

```ts
searchPatients(query, context)
createPatient(input, context)
updatePatient(patientId, input, context)
getPatientSummary(patientId, context)
listPatientTimeline(patientId, cursor, context)
deactivatePatient(patientId, reason, context)
```

`createPatient` retorna candidatos a duplicidade antes da confirmação quando houver similaridade forte.

### 10.2 Agenda

```ts
listCalendar(range, filters, context)
createAppointment(input, context)
rescheduleAppointment(id, input, expectedVersion, context)
transitionAppointment(id, targetStatus, reason, expectedVersion, context)
createScheduleBlock(input, context)
```

Conflitos retornam erro de domínio com o intervalo e recurso ocupado, sem expor dados de outra clínica.

### 10.3 Atendimento

```ts
startEncounter(appointmentId, context)
getEncounter(encounterId, context)
saveEncounterDraft(encounterId, input, expectedVersion, context)
finalizeEncounter(encounterId, expectedVersion, context)
addEncounterAddendum(encounterId, input, context)
generateClinicalDocument(encounterId, input, context)
```

O cliente faz autosave após pausa curta, cancela requisições obsoletas e exibe `salvando`, `salvo`, `conflito` ou `erro`.

### 10.4 Financeiro

```ts
ensureAppointmentReceivable(appointmentId, context)
createFinancialEntry(input, context)
recordPayment(entryId, input, idempotencyKey, context)
reversePayment(paymentId, reason, context)
listFinancialEntries(filters, cursor, context)
getCashSummary(dateRange, context)
closeCashSession(input, context)
```

### 10.5 Auditoria

```ts
appendAuditEvent(event, transaction?)
listAuditEvents(filters, cursor, context)
```

Eventos de auditoria de mutações críticas devem estar na mesma transação ou usar outbox consistente.

---

## 11. Rotas e composição de interface

### 11.1 Rotas públicas

```text
/entrar
/recuperar-senha
/redefinir-senha
/convites/[token]
```

### 11.2 Rotas autenticadas

```text
/visao-geral
/hoje
/agenda
/pacientes
/pacientes/novo
/pacientes/[id]/resumo
/pacientes/[id]/prontuario
/pacientes/[id]/agendamentos
/pacientes/[id]/financeiro
/pacientes/[id]/arquivos
/atendimentos/[id]
/financeiro
/financeiro/novo-lancamento
/relatorios
/configuracoes/clinica
/configuracoes/equipe
/configuracoes/agenda
/configuracoes/servicos
/configuracoes/seguranca
```

### 11.3 Componentes de fundação

Construir antes das páginas:

```text
AppShell
Sidebar
Topbar
WorkspaceSwitcher
PageHeader
PageEyebrow
PrimaryButton / SecondaryButton / IconButton / DangerButton
TextField / TextArea / SelectField / DateField / MoneyField
Card / ListCard / MutedSurface
StatusBadge
Tabs
EmptyState
InlineError
LoadingState
ConfirmDialog
PermissionBoundary
AuditNotice
```

Todos obedecem aos tokens, raios, alturas e estados do `DESIGN.md`. Não introduzir shadcn como tema paralelo, gradientes, outras bibliotecas de ícones ou hexadecimais em componentes de produto.

### 11.4 Componentes por domínio

```text
PatientSearch
PatientDuplicateWarning
PatientSummaryPanel
AppointmentForm
CalendarDayView
CalendarWeekView
TodayQueue
AppointmentStatusMenu
EncounterEditor
AutosaveIndicator
ClinicalTimeline
AddendumForm
FinancialEntryForm
PaymentDialog
CashSummary
ReportMetric
```

### 11.5 Responsividade mínima

Validar em:

- 390 × 844;
- 768 × 1024;
- 1440 × 900;
- 1920 × 1080.

No mobile:

- sidebar vira navegação acionável e acessível;
- agenda semanal vira lista diária;
- ações não dependem de hover;
- atendimento fica em uma coluna;
- tabelas viram linhas empilhadas.

---

## 12. Busca, arquivos e PDFs

### 12.1 Busca de pacientes

- Normalizar acentos e caixa em `search_name`.
- Normalizar telefone para E.164 quando possível.
- CPF pesquisável somente por hash de igualdade.
- Usar `pg_trgm` para nomes.
- Limitar resultados e paginar por cursor.
- Registrar evento de auditoria para abertura da ficha, não para cada tecla de busca.
- Nunca retornar conteúdo clínico no resultado global.

### 12.2 Upload

Fluxo:

```text
solicitar upload → validar permissão/tamanho/tipo → URL temporária
→ upload privado → confirmar hash/metadados → scan → disponibilizar
```

Regras:

- bucket privado;
- chave inclui organização e UUID não previsível;
- formatos permitidos por categoria;
- limite inicial de 5 MB, configurável;
- validar MIME real, não apenas extensão;
- URL de download assinada, curta e emitida após autorização;
- arquivos em quarentena não são baixáveis;
- nome original nunca é usado como chave.

### 12.3 PDF clínico

- Conteúdo nasce de snapshot estruturado.
- Documento gerado recebe identificador, data, autor e indicação clara de que não possui assinatura digital quando aplicável.
- PDF não deve depender do estado atual do paciente depois de gerado.
- Anulação mantém o arquivo e registra motivo; não apaga histórico.

---

## 13. Auditoria, logs e privacidade

### 13.1 Auditar

- login, logout, falhas e MFA;
- troca de workspace;
- leitura e exportação de prontuário;
- criação e edição de paciente;
- criação, reagendamento e mudança de status;
- início, autosave relevante, finalização e adendo;
- geração/impressão/download de documento clínico;
- upload/download de arquivo;
- criação, pagamento, reversão e fechamento de caixa;
- alteração de equipe, papel e permissão;
- exportações e ações administrativas.

### 13.2 Não registrar em log técnico

- corpo do prontuário;
- CPF, senha, token ou cookie;
- conteúdo de anexos;
- query completa contendo dado pessoal;
- payload bruto de formulário;
- URL assinada.

### 13.3 Analytics

Eventos de produto usam identificadores internos pseudonimizados e nunca recebem texto livre clínico. A ferramenta de analytics deve poder ser desligada por ambiente.

---

## 14. Variáveis de ambiente

Criar `.env.example` sem valores secretos:

```text
APP_URL=
NODE_ENV=
DATABASE_URL=
DATABASE_DIRECT_URL=
AUTH_SECRET=
EMAIL_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
FIELD_ENCRYPTION_KEY=
OTEL_EXPORTER_OTLP_ENDPOINT=
LOG_LEVEL=
```

Validar ambiente no boot com schema tipado. A aplicação deve falhar cedo quando uma variável obrigatória estiver ausente.

---

## 15. Estratégia de testes

### 15.1 Unitários

Cobrir regras puras:

- transições de agendamento;
- cálculo de status financeiro;
- alocação e reversão de pagamentos;
- permissões;
- normalização e deduplicação;
- conversão de fuso e intervalos;
- conflito de versão no prontuário;
- contraste de cor da marca.

### 15.2 Integração com banco real

- migrations sobem do zero;
- RLS impede acesso cruzado;
- conflito de agenda resiste a duas transações concorrentes;
- finalização torna prontuário imutável;
- adendo é append-only;
- pagamento idempotente não duplica valor;
- outbox é persistida com a mutação;
- cancelamento mantém histórico.

Não substituir esses testes por mocks.

### 15.3 E2E

Fluxos obrigatórios:

1. Admin cria clínica, serviço e convida usuários.
2. Recepção cria paciente, agenda e faz check-in.
3. Profissional inicia atendimento, sofre autosave, finaliza e adiciona adendo.
4. Recepção registra pagamento e financeiro vê o caixa.
5. Recepção tenta abrir prontuário e recebe bloqueio.
6. Admin sem perfil clínico tenta abrir prontuário e recebe bloqueio.
7. Usuário da clínica A tenta URL da clínica B e não obtém dados.
8. Dois usuários tentam reservar o mesmo horário e apenas um consegue.
9. Repetição da mesma requisição de pagamento não duplica o pagamento.
10. Mobile completa agendamento e check-in.

### 15.4 Visual e acessibilidade

- snapshots das páginas-chave nos quatro viewports;
- axe ou verificação equivalente nas páginas principais;
- navegação por teclado;
- foco visível;
- labels e nomes acessíveis;
- contraste claro/escuro;
- `prefers-reduced-motion`.

### 15.5 Segurança

- IDOR/BOLA por recurso e tenant;
- CSRF onde aplicável;
- XSS em todo campo de texto livre;
- upload malicioso e MIME divergente;
- enumeração de e-mail;
- rate limit;
- sessão revogada;
- dependências e secrets scan;
- cabeçalhos de segurança e CSP compatível.

---

## 16. Qualidade, CI e comandos canônicos

Definir scripts:

```text
pnpm dev
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:security
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm build
```

Pipeline de pull request:

```text
install frozen → lint → format:check → typecheck → unit
→ integration → build → E2E crítico
```

Pipeline da branch principal adiciona varredura de dependências, artefato versionado e deploy em homologação.

### Definition of Done de qualquer tarefa

- critério funcional atendido;
- autorização aplicada no servidor;
- tenant aplicado e testado;
- validação de entrada e erro amigável;
- auditoria adicionada quando necessário;
- loading, vazio, erro e responsividade tratados;
- testes proporcionais executados;
- nenhuma informação sensível em logs;
- documentação ou ADR atualizada quando a decisão mudou;
- `lint`, `typecheck`, testes relevantes e `build` passam.

---

## 17. Desenvolvimento local e ambientes

### 17.1 Docker Compose local

Serviços:

- PostgreSQL;
- MinIO;
- Mailpit;
- scanner de arquivos, quando a fase de anexos começar.

Não colocar aplicação Next.js obrigatoriamente no Compose; executar com pnpm facilita o ciclo local.

### 17.2 Ambientes

```text
development → dados sintéticos locais
test        → banco efêmero isolado
staging     → configuração semelhante à produção, sem dados reais
production  → acesso restrito, backups e observabilidade ativos
```

Nunca copiar base de produção para desenvolvimento. Seeds devem usar nomes e informações fictícias claramente marcadas.

### 17.3 Migrations

- Forward-only em ambientes compartilhados.
- SQL gerado deve ser revisado.
- Mudança destrutiva segue expand/migrate/contract.
- Deploy aplica migration com lock e verificação de compatibilidade.
- Toda migration crítica tem plano de rollback operacional, mesmo quando o schema não volta automaticamente.

---

## 18. Fases de implementação

Cada fase termina com código executável, testes e relatório no arquivo `docs/progress.md`. Não começar a fase seguinte deixando falhas críticas na anterior.

### Fase 0 — Bootstrap e decisões fundamentais

Entregáveis:

- Next.js, TypeScript, Tailwind e pnpm configurados;
- Docker Compose local;
- Supabase client, migration SQL e primeira validação RLS;
- Vitest e Playwright;
- lint, formatter, typecheck e CI;
- `.env.example` e validação de ambiente;
- README com setup;
- ADRs iniciais:
  - monólito modular;
  - Supabase/PostgreSQL;
  - Better Auth;
  - multitenancy/RLS;
  - centavos inteiros;
  - armazenamento privado;
- shell visual mínimo renderizado.

Aceite:

- novo desenvolvedor sobe tudo seguindo apenas o README;
- migration e seed funcionam em banco vazio;
- pipeline passa;
- nenhuma funcionalidade clínica fictícia está hardcoded na UI.

### Fase 1 — Design system, autenticação e tenancy

Entregáveis:

- tokens completos do `DESIGN.md`;
- AppShell responsivo;
- componentes base;
- login, recuperação e convite;
- organizações, locations e memberships;
- troca de workspace;
- papéis/capacidades;
- RLS e teste A/B;
- tema por organização carregado junto aos dados.

Aceite:

- dados e tema trocam atomicamente;
- usuário suspenso perde acesso;
- acesso direto sem permissão falha no servidor;
- componentes funcionam em claro, escuro e mobile.

### Fase 2 — Configuração e pacientes

Entregáveis:

- clínica, equipe e profissionais;
- serviços, salas e disponibilidade;
- listagem, busca e cadastro de pacientes;
- cadastro mínimo no fluxo de agendamento;
- aviso de duplicidade;
- responsáveis, alertas administrativos e anexos básicos;
- ficha com abas e autorização por aba.

Aceite:

- busca tolera acentos e telefone formatado;
- CPF não aparece em logs e duplicidade funciona;
- recepção não acessa aba clínica;
- dados da organização B não aparecem por ID ou busca.

### Fase 3 — Agenda e “Hoje”

Entregáveis:

- visualizações dia/semana;
- criar, reagendar e cancelar;
- bloqueios e prevenção de conflito;
- histórico de status;
- fila “Hoje”;
- confirmação, check-in, falta e início de atendimento;
- lista de espera simples;
- link manual de WhatsApp.

Aceite:

- duas reservas concorrentes não ocupam o mesmo horário;
- datas respeitam o fuso da clínica;
- mobile usa lista diária funcional;
- cada transição inválida é rejeitada no domínio e no servidor.

### Fase 4 — Prontuário e atendimento

Entregáveis:

- encounter e formulário estruturado;
- autosave com controle de versão;
- sinais vitais e diagnósticos opcionais;
- histórico clínico;
- finalização imutável;
- adendo append-only;
- documentos PDF básicos;
- trilha de acesso e geração/download;

Aceite:

- nenhuma nota finalizada pode ser editada por UI, action, route ou SQL de papel de aplicação;
- conflito de versões não sobrescreve texto;
- recarregar a página recupera o último rascunho persistido;
- recepção, financeiro e admin sem perfil clínico não acessam conteúdo.

### Fase 5 — Financeiro

Entregáveis:

- cobrança automática por agendamento/atendimento;
- receitas e despesas avulsas;
- pagamentos parciais;
- reversão;
- categorias;
- caixa diário;
- filtros e CSV;
- permissões e auditoria.

Aceite:

- pagamento repetido com mesma chave é idempotente;
- status corresponde ao total válido;
- reversão preserva histórico;
- CSV respeita tenant, filtros e permissões.

### Fase 6 — Dashboard e relatórios

Entregáveis:

- Visão geral;
- agendamentos por status;
- faltas/cancelamentos;
- pacientes novos/recorrentes;
- receitas, despesas e pendências;
- serviços e ocupação;
- filtros consistentes e consultas indexadas.

Aceite:

- números batem com queries de referência;
- dashboard não expõe conteúdo clínico;
- queries principais têm planos aceitáveis com volume de teste.

### Fase 7 — Hardening e piloto

Entregáveis:

- MFA obrigatório para perfis definidos;
- upload com scan/quarentena;
- CSP e headers;
- rate limits;
- observabilidade e alertas;
- runbooks de incidente, backup e restauração;
- teste de restauração;
- carga e concorrência;
- pentest;
- acessibilidade e QA visual;
- checklist jurídico/privacidade pendente explicitado.

Aceite:

- zero vulnerabilidades críticas ou altas conhecidas;
- restauração validada;
- teste de isolamento completo passa;
- fluxo crítico atende orçamento de desempenho;
- piloto só é habilitado após gates externos.

---

## 19. Backlog técnico priorizado

| ID | Item | Depende de | Fase |
| --- | --- | --- | ---: |
| TEC-001 | Bootstrap Next.js/pnpm/CI | — | 0 |
| TEC-002 | Compose PostgreSQL/MinIO/Mailpit | TEC-001 | 0 |
| TEC-003 | Supabase client, migrations e seed | TEC-002 | 0 |
| TEC-004 | Tokens e componentes base | TEC-001 | 0–1 |
| SEC-001 | Auth e sessões | TEC-003 | 1 |
| SEC-002 | Organizations/memberships | SEC-001 | 1 |
| SEC-003 | Contexto de requisição e capabilities | SEC-002 | 1 |
| SEC-004 | RLS e testes cross-tenant | SEC-003 | 1 |
| ORG-001 | Clínica, equipe e profissionais | SEC-004 | 2 |
| ORG-002 | Serviços, salas e agenda-base | ORG-001 | 2 |
| PAT-001 | Schema/repositório de pacientes | SEC-004 | 2 |
| PAT-002 | Busca/deduplicação | PAT-001 | 2 |
| PAT-003 | Ficha/contatos/alertas | PAT-001 | 2 |
| SCH-001 | Schema e máquina de estados | ORG-002, PAT-001 | 3 |
| SCH-002 | Restrição concorrente de conflito | SCH-001 | 3 |
| SCH-003 | Agenda dia/semana | SCH-001 | 3 |
| SCH-004 | Tela Hoje | SCH-001 | 3 |
| CLI-001 | Encounter e autorização clínica | SCH-004 | 4 |
| CLI-002 | Editor e autosave | CLI-001 | 4 |
| CLI-003 | Finalização/adendo imutável | CLI-002 | 4 |
| CLI-004 | PDFs clínicos | CLI-003 | 4 |
| FIN-001 | Ledger operacional | SCH-001 | 5 |
| FIN-002 | Pagamentos/reversões | FIN-001 | 5 |
| FIN-003 | Caixa e CSV | FIN-002 | 5 |
| REP-001 | Dashboard e relatórios | SCH-004, FIN-003 | 6 |
| FILE-001 | Upload privado e scan | PAT-003 | 7 |
| OPS-001 | Observabilidade e runbooks | TEC-001 | 7 |
| SEC-005 | MFA, rate limit, CSP e pentest | SEC-001 | 7 |
| QA-001 | Acessibilidade, visual e carga | fases 1–6 | 7 |

---

## 20. Orçamentos não funcionais

Valores iniciais para homologação, medidos em condições documentadas:

| Área | Meta |
| --- | --- |
| Página operacional p95 | até 2 s no ambiente-alvo |
| Busca de pacientes p95 | até 500 ms com 100 mil pacientes/tenant de teste |
| Mutação comum p95 | até 800 ms sem provedor externo |
| Autosave | confirmação em até 1 s na rede de teste |
| Disponibilidade do piloto | meta inicial 99,5% mensal |
| RPO | até 24 h no desenvolvimento; produção definido antes do piloto |
| RTO | definido e testado antes do piloto |
| Acessibilidade | WCAG 2.2 AA nos fluxos críticos |

Não prometer RPO/RTO de produção antes da escolha de infraestrutura e do teste de restauração.

---

## 21. Threat model mínimo

Criar `docs/threat-model/initial.md` cobrindo ao menos:

- vazamento entre clínicas;
- abuso de privilégios internos;
- enumeração de pacientes;
- roubo de sessão;
- acesso a URL assinada;
- upload malicioso;
- injeção/XSS em notas;
- logs e analytics com dados sensíveis;
- sobrescrita de prontuário;
- duplicação/fraude de pagamento;
- exportação em massa;
- credenciais e chaves expostas;
- indisponibilidade e perda de dados.

Cada ameaça deve registrar ativo, ator, caminho, impacto, controles preventivos, detecção e resposta.

---

## 22. Regras para o agente executor

1. Leia os três documentos da seção 1 por completo.
2. Inspecione `AGENTS.md`, skills e instruções aplicáveis antes de editar.
3. Faça inventário do repositório e preserve alterações existentes.
4. Se o repositório estiver vazio, comece pela Fase 0.
5. Mantenha `docs/progress.md` com fase, concluído, testes e bloqueios reais.
6. Execute a menor fase completa que produza um estado verificável.
7. Não crie mockups desconectados do domínio quando a fase pedir fluxo funcional.
8. Faça suposições reversíveis e registre-as em ADR; pergunte apenas se a resposta mudar segurança, escopo ou arquitetura de forma material.
9. Não use dados pessoais reais em seed, teste, screenshot ou log.
10. Não desative RLS, testes ou checagens para “fazer passar”.
11. Corrija a causa dos erros e mantenha migration, schema e tipos alinhados.
12. Use subagentes somente se o ambiente permitir e se as tarefas forem independentes; evite edições concorrentes nos mesmos arquivos.
13. Rode verificações proporcionais durante a fase e a suíte exigida no gate final.
14. Ao concluir uma fase, informe arquivos, migrations, decisões, testes e riscos restantes.
15. Não declare o MVP pronto para dados reais sem cumprir a Fase 7 e os gates externos.

### Calibração para GPT-6 Astra

A documentação oficial informa que Astra responde melhor quando autonomia, estilo e profundidade dos testes são explicitados. Para este projeto:

- usar raciocínio `high` nas fases 0, 1, 4 e 7;
- usar `medium` nas demais, salvo falha complexa;
- persistir até fechar a fase atual;
- comunicar em português, com resumo curto e evidências;
- não repetir testes amplos depois que passaram, salvo nova mudança relevante;
- tratar instruções do repositório como vinculantes e apontar conflitos concretos.

Referência: [OpenAI — Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model).

---

## 23. Relatório padrão ao final de cada fase

```markdown
## Fase N — Resultado

### Entregue
- ...

### Decisões/ADRs
- ...

### Banco e migrations
- ...

### Verificações executadas
- `pnpm ...` — passou/falhou

### Segurança e tenancy
- ...

### Pendências reais
- ...

### Próxima fase
- ...
```

---

## 24. Checklist antes de iniciar a implementação

- [ ] Os três documentos foram lidos.
- [ ] O repositório e o estado do Git foram inspecionados.
- [ ] As premissas da seção 3 foram aceitas como defaults provisórios.
- [ ] Nenhuma credencial real foi adicionada ao repositório.
- [ ] A Fase 0 foi transformada em tarefas pequenas.
- [ ] `docs/progress.md` foi criado.
- [ ] O ambiente local e o CI têm critérios claros de sucesso.

## 25. Checklist antes do piloto

- [ ] RLS e testes cross-tenant passam em todos os módulos.
- [ ] Permissões clínicas foram revisadas.
- [ ] Prontuário finalizado é imutável e adendo é append-only.
- [ ] Pagamentos são idempotentes e reversíveis por lançamento compensatório.
- [ ] MFA está ativo para perfis definidos.
- [ ] Upload é privado, validado e escaneado.
- [ ] Logs e analytics foram revisados para dados sensíveis.
- [ ] Backup foi restaurado com sucesso.
- [ ] Runbook de incidente foi exercitado.
- [ ] Pentest não possui achados críticos/altos abertos.
- [ ] Fluxos críticos passaram no desktop e mobile.
- [ ] Acessibilidade foi verificada.
- [ ] Revisão jurídica, LGPD, CFM/SBIS e contratos foi concluída.
- [ ] Comunicação comercial não promete certificação inexistente.
