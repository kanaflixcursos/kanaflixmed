# Kanaflix MED — Progresso de execução

## Estado atual

- Fase 0: bootstrap e publicação inicial concluídos.
- Fase 1: shell visual inicial entregue; autenticação e tenancy ainda pendentes.
- Fase 3: dashboard visual inicial entregue; agenda funcional em implementação.

## Entregue neste ciclo

- Bootstrap Next.js 16.3.5 + React 19.2.8 + TypeScript.
- Tailwind CSS 4, Google Sans Flex, Lucide e Framer Motion.
- Shell responsivo baseado no `DESIGN.md`.
- Dashboard inicial com métricas, agenda do dia, acompanhamento e alertas.
- Cliente Supabase para browser e server.
- Migration inicial do modelo MVP e políticas RLS.
- `.env.example` apontando para o projeto Supabase conectado.
- Migration aplicada no projeto Supabase `eqceqkcbnehlhsrkrelf`.
- Repositório GitHub conectado: `kanaflixcursos/kanaflixmed`, branch `main`.
- Deploy de produção publicado na Vercel: https://kanaflixmed.vercel.app
- Variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas na Vercel para Production.
- Fluxo inicial de autenticação Supabase: tela de login, callback de sessão e proxy compatível com Next.js 16.
- Camada de consultas protegidas para contexto da organização e agenda diária, pronta para ligar ao dashboard.
- Onboarding inicial da clínica via RPC `create_organization`, criando organização e primeiro membership ADMIN em uma operação segura.
- Endpoint `/api/dashboard` e hidratação da agenda com dados Supabase quando existe sessão autenticada.
- Módulo inicial de pacientes: listagem, busca, formulário de cadastro e API `GET/POST /api/patients` protegida por sessão e RLS.
- Ciclo de pacientes ampliado: edição via `PATCH /api/patients` e inativação reversível via `DELETE /api/patients`, preservando histórico e removendo inativos dos novos fluxos.
- Módulo inicial de agenda: visualização por dia, criação de agendamentos, APIs `GET/POST /api/appointments` e catálogo ativo de serviços em `GET/POST /api/services`.
- Onboarding agora cria automaticamente o serviço inicial “Consulta” (30 minutos, sem preço definido).

## Verificações

- `pnpm lint` — passou.
- `pnpm build` — passou.
- Validação manual no navegador local — página renderizada em `http://localhost:3000`.
- Deploy de produção — concluído com status Ready na Vercel.
- Tela `/login` validada localmente.
- Tela `/onboarding` validada localmente.
- `/api/dashboard` validado sem sessão, retornando contexto nulo sem expor dados.
- `/api/patients` validado sem sessão, retornando `401`.
- Tela `/patients` validada localmente com estado vazio seguro.
- Build/lint validados após o módulo de agenda.
- Deploy do módulo de pacientes validado em produção; a rota `/patients` abre com estado seguro sem sessão.
- Deploy da agenda validado em produção; a rota `/agenda` abre com estado seguro sem sessão e a navegação do dashboard funciona.
- Lint e build validados após edição/inativação de pacientes.

## Próximo bloco

1. Criar o primeiro usuário administrador e exercitar o onboarding real.
2. Ativar `KANAFLIX_REQUIRE_AUTH=true` depois de validar o primeiro acesso.
3. Adicionar histórico de alterações e detalhe do paciente.
4. Adicionar testes de autorização, fluxo de agenda e smoke test de produção.

## Riscos e decisões pendentes

- A migration inicial foi aplicada; ainda precisa ser exercitada com dados de teste e cenários RLS.
- O fluxo de convite e MFA depende da configuração de Auth no Supabase.
- A proteção está opt-in enquanto não existe um administrador inicial; o projeto usa dados demonstrativos nesse período.
- O fluxo real de onboarding depende de um usuário criado no Supabase Auth; nenhum usuário foi criado automaticamente.
