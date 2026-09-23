# Central Clínica — plano de evolução operacional

## Registro de execução — 23/09/2026

- **Implementado no checkout:** dashboard e agregações, calendário por período, detalhe e remarcação transacional, criação de agendamento em página própria, prontuário mínimo, timeline paginada e edição de perfil profissional/clínica. O fluxo pós-login agora aponta para `/dashboard`.
- **Verificações locais:** `pnpm exec tsc --noEmit`, `pnpm lint` e `pnpm build` passaram.
- **Supabase de produção:** migração aplicada. Como o projeto já tinha a estrutura-base, mas não tinha histórico de migrações, os cinco marcos existentes foram reconciliados como aplicados sem reaplicar seus SQLs. A prévia seguinte mostrou somente a nova migração; confirmei tabela de remarcações, restrição de sobreposição, RPCs, grants e histórico remoto.
- **Vercel de produção:** commit `f05391e` enviado para `main`; check da Vercel concluiu com sucesso. Validei `/login` com HTTP 200 e nome Central Clínica; `/api/dashboard` sem sessão retorna 401 `AUTH_REQUIRED`, como esperado.
- **Aceite autenticado ainda recomendado:** entrar com a conta clínica e conferir dashboard, criação/remarcação de consulta, prontuário e edição de perfil com os dados reais da clínica. O build e a implantação não substituem esse teste funcional autenticado.

Estado: implementação publicada em `main` no commit `f05391e` (23/09/2026). A base examinada antes do trabalho era `4b56b3e`; a seção acima registra a migração, deploy e verificações realizadas.

## Objetivo e limite

Transformar a área autenticada numa central de trabalho do médico: visão dos próximos atendimentos, indicadores confiáveis, calendário operável, histórico do paciente legível e perfis editáveis. A rota pública `/` continua abrindo `/login`, conforme a decisão anterior. **Depois** de entrar ou concluir a configuração da clínica, o destino passa a ser `/dashboard`.

Manter a identidade do `DESIGN.md`: fundo azul claro, sidebar e topbar brancas, cards arredondados, tipografia Google Sans Flex, ícones Lucide e cores de status com rótulos textuais. Não preencher números ou gráficos com dados fictícios.

## Ponto de partida confirmado no código

| Área | Hoje | Implicação |
| --- | --- | --- |
| Entrada | Login e onboarding enviam a conta com clínica para `/agenda`; `/` redireciona para `/login` | Trocar apenas o destino pós-autenticação quando o dashboard estiver pronto |
| Agenda | Lista de um dia, criação em modal e campo `datetime-local` | Criar calendário por intervalo, página de novo agendamento e campos separados |
| Estados | `SCHEDULED`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `NO_SHOW`, `CANCELLED` | `SCHEDULED` pode aparecer como **Pré-agendada**; `CONFIRMED`, como **Confirmada** |
| Histórico | Eventos de mudança de status existem; datas antigas de uma remarcação não são registradas | Criar trilha de remarcação antes de contabilizá-la em gráfico ou timeline |
| Paciente | Detalhe lista até 30 agendamentos, sem navegação para o detalhe da consulta | Separar futuras/passadas, criar timeline paginada e link para consulta |
| Financeiro | Cobrança nasce ao concluir consulta com preço positivo; recebimentos ficam em `payments` | Separar previsão da agenda, valores a receber e dinheiro recebido |
| Perfis | Topbar mostra nome vindo do Auth; clínica tem nome e fuso no banco | Tornar nome clicável, definir fonte única de dados e permissões de edição |

`docs/progress.md` é um registro histórico: menciona um dashboard visual que já foi retirado. Para esta fase, prevalecem as rotas e os dados presentes no código.

## Regras de produto para os indicadores

1. Períodos **Dia / Semana / Mês**, com navegação para período anterior/próximo e comparação com o período anterior equivalente. Semana começa na segunda-feira. Todos os limites e agrupamentos usam `organizations.timezone` (padrão atual: `America/Sao_Paulo`); timestamps continuam armazenados em UTC.
2. **Realizadas** são consultas que chegaram a `COMPLETED` no período, contadas pelo evento em `appointment_status_events.occurred_at`. **Finalizadas** são consultas cujo prontuário (`encounters`) passou a `FINALIZED` no período, contado por `finalized_at`. São marcos diferentes do mesmo atendimento e **não devem ser somados entre si**. Mostrar também “Prontuários pendentes”: consultas realizadas que ainda não têm prontuário finalizado.
3. **Canceladas** são consultas que passaram a `CANCELLED` no período. **Remarcadas** são consultas distintas com evento de mudança de horário no período; uma consulta remarcada duas vezes no mesmo período conta uma vez no card, embora a timeline mostre as duas mudanças.
4. **Pré-agendadas** e **Confirmadas** mostram o estado atual de consultas cuja data marcada cai no período. `NO_SHOW`, `CANCELLED` e `COMPLETED` não aparecem como próximas consultas.
5. **Previsão de receita** soma `price_cents` das consultas futuras pré-agendadas e confirmadas dentro do período selecionado, mostrando os dois grupos separados. É potencial bruto, sem aplicar probabilidade arbitrária. Em períodos inteiramente passados, não há previsão futura. Preço zero aparece como “sem valor definido” e é excluído do valor estimado, mas contado separadamente.
6. **A receber** vem das cobranças ainda abertas em `financial_entries`, descontando pagamentos; **recebido** vem de pagamentos efetivos por `paid_at`, líquido de estornos. Essas métricas não se somam à previsão da agenda. Agregações percorrem todo o intervalo no servidor, sem reutilizar o limite atual de 200 lançamentos da tela financeira.
7. O dashboard mostra **sempre a clínica inteira**, sem alternância para agenda pessoal. Valores financeiros só aparecem para papéis autorizados pela política financeira existente (`ADMIN`, `RECEPTION`, `FINANCE`). Para papéis clínicos, a contagem agregada de prontuários pode ser clínica inteira, mas dados narrativos continuam restritos ao profissional responsável e ao administrador conforme as políticas atuais.

As definições de clínica inteira e de prontuário encerrado foram confirmadas pelo usuário. Como ainda não há interface de prontuário, a finalização clínica mínima faz parte desta fase; não exibir “finalizadas” como sinônimo de `COMPLETED`.

## Telas e interações

### 1. Dashboard (`/dashboard`)

- Cabeçalho com saudação, nome da clínica, período Dia/Semana/Mês e navegação temporal. Todos os números representam a clínica inteira.
- Cards: consultas previstas, confirmadas, realizadas, prontuários finalizados, prontuários pendentes, canceladas e remarcadas; comparação com o período anterior apenas quando houver base equivalente.
- Gráfico temporal das mudanças de estado, com legenda e tabela acessível dos mesmos números. No dia, agrupar por hora; na semana, por dia; no mês, por semana ou dia conforme legibilidade.
- Box **Próximas consultas**: 5 próximas consultas não canceladas, ordenadas por início, com horário, paciente, serviço, estado e link para o detalhe. Mostrar botão para abrir a agenda completa. Estados vazios honestos.
- Bloco financeiro para papéis autorizados: previsão separada em pré-agendada/confirmada, a receber e recebido. Informar quantas consultas ainda não têm preço configurado.
- Layout desktop em cards e duas colunas; no mobile, cards empilhados, gráfico rolável/legível e próximas consultas antes da seção financeira.

### 2. Agenda (`/agenda`)

- Calendário **Semana** como vista inicial, com alternância Dia/Mês. Dia e semana mostram horários; mês mostra resumo por data. No mobile, a vista Dia deve ser a opção principal.
- Cores e texto consistentes: pré-agendada (azul claro), confirmada (azul forte), em espera/atendimento (âmbar), **consulta concluída** (verde), cancelada/não compareceu (cinza/vermelho). O prontuário encerrado recebe um marcador próprio, sem confundir os dois marcos. A cor nunca é o único sinal.
- Filtros por profissional e estado quando houver equipe; manter data e filtros na URL para preservar o contexto ao voltar de um detalhe.
- Clique na consulta abre `/agenda/[id]`, com paciente, serviço, profissional, horário, status, observação operacional, histórico de estados e remarcações. Ações exibidas conforme transições permitidas; cancelamento e falta exigem motivo. Para o profissional responsável, o detalhe também oferece abertura ou continuação do prontuário.
- Clique em horário vazio ou botão **Novo agendamento** abre `/agenda/novo?data=AAAA-MM-DD&hora=HH:mm`, com os campos preenchidos quando houver contexto.

### 3. Novo agendamento (`/agenda/novo`)

- Página completa, com seleção de paciente e serviço à esquerda e data/horário à direita no desktop; coluna única no mobile. Manter uma saída clara para voltar à agenda.
- Data escolhida em calendário visual acessível, com navegação por mês; **horário em campo separado**, com intervalos fáceis de selecionar e indicação de conflitos conhecidos. Exibir duração, término calculado e preço do serviço antes de salvar. Horários de expediente e regras de disponibilidade recorrente ficam para uma etapa própria, quando houver configuração desses dados.
- O servidor calcula `ends_at` a partir do serviço; não confia no horário final enviado pelo navegador. Converter data e hora do fuso da clínica para UTC uma única vez. Validar serviço/paciente ativos, horário futuro e conflito com outra consulta do mesmo profissional.
- Ao salvar, abrir o detalhe da consulta criada; a agenda volta ao mesmo período. Erros de horário ocupado ou dados alterados indicam o campo e preservam o formulário.
- Pode-se usar um calendário de entrada acessível como DayPicker e o **FullCalendar Standard** para as vistas da agenda, estilizados com os tokens do `DESIGN.md`. Revisar a versão e a integração com Next.js na implementação; não usar recursos Premium pagos sem nova decisão.

### 4. Encerramento clínico mínimo (`/agenda/[id]/prontuario`)

- Aproveitar a tabela `encounters`, que já separa `DRAFT` e `FINALIZED`. Permitir criar e salvar rascunho ligado à consulta, com queixa principal, história, exame, avaliação e plano. Esta fase não inclui receitas, laudos ou anexos.
- O profissional responsável pode editar o próprio rascunho e finalizá-lo **após** a consulta chegar a `COMPLETED`. Registrar `finalized_at`, `finalized_by`, versão e auditoria numa operação transacional. Depois de finalizado, exibir em leitura; correções futuras exigirão fluxo próprio de adendo.
- `ADMIN` pode consultar quando a política permitir, mas não finalizar em nome de outro profissional. Recepção e financeiro não recebem conteúdo clínico. O dashboard só consulta contagens agregadas para a clínica inteira.

### 5. Histórico do paciente (`/patients/[id]`)

- Separar **Próximas consultas** de **Histórico**. O histórico vira timeline vertical agrupada por mês, mais recente primeiro, com data/hora, serviço, profissional, status, resumo operacional e marcador de remarcação quando aplicável.
- Clicar em um evento abre `/agenda/[id]`; o detalhe mantém link de volta ao paciente. A timeline mostra mudanças de horário e de status sem duplicar a consulta como se fosse um atendimento novo.
- Buscar mais registros por paginação/cursor, em vez de encerrar silenciosamente nos 30 atuais. Não misturar observações administrativas com evolução clínica; a timeline pode indicar que o prontuário foi finalizado, mas só oferece acesso ao conteúdo para papéis permitidos.

### 6. Meu perfil e perfil da clínica

- O nome e avatar na topbar tornam-se botão com menu **Meu perfil**, **Perfil da clínica** (somente administrador) e **Sair**. O nome da clínica no rodapé lateral também leva ao perfil da clínica quando permitido.
- `/perfil`: nome exibido, título profissional, conselho, número e UF quando aplicável. E-mail de login é exibido como dado da conta; alteração de e-mail exige fluxo de confirmação do Supabase e fica fora desta primeira entrega. Sem upload de foto no MVP; usar iniciais.
- `/configuracoes/clinica`: nome, fuso horário e contato básico (telefone, e-mail, endereço) com migração para os campos que ainda não existem. Identificador (`slug`) exibido sem edição nesta fase. Apenas `ADMIN` pode salvar.
- Usar `memberships.display_name` como nome operacional na topbar, com `auth.user_metadata.full_name` como fallback. Edição do próprio perfil passa por endpoint/RPC com campos permitidos explicitamente; não conceder atualização irrestrita de `role`, `status` ou `organization_id`. Atualização da clínica exige verificação de papel no servidor e evento de auditoria.

## Contratos e alterações técnicas

| Componente | Mudança planejada |
| --- | --- |
| Navegação/Auth | Adicionar Dashboard à sidebar e ao escopo do `ClinicalShell`; login, callback Google e onboarding concluído direcionam para `/dashboard`. `/` continua `/login`. |
| `GET /api/dashboard` | Receber `period` e `anchor` validados; retornar séries de estados, consultas realizadas, prontuários finalizados/pendentes, próximas consultas e seção financeira condicional. Agregar no banco por clínica e por fuso, sem parâmetro de escopo pessoal. |
| `GET /api/appointments` | Aceitar intervalo `start`/`end` e filtros autorizados, com limite de até 42 dias por chamada para mês visível; manter separação por `organization_id` e RLS. |
| Agendamento | Validar disponibilidade no banco e calcular término/preço no servidor. Adicionar `GET/PATCH /api/appointments/[id]` para detalhe e remarcação com `version` otimista. Preservar transições existentes. |
| Histórico | Criar `appointment_reschedules` com agendamento, horários antigo/novo, motivo, autor e data do evento; índices por organização, consulta e ocorrência. Estender retorno paginado do paciente. |
| Prontuário | Criar `GET/POST/PATCH /api/appointments/[id]/encounter` para rascunho e ação transacional de finalização, vinculada a `encounters`. Impor autoria, estado da consulta, versão e auditoria; retornar somente dados permitidos ao papel. |
| Perfis | Criar `GET/PATCH /api/me` e `GET/PATCH /api/clinic`, com validação de campos, papel e auditoria. Migração de contato da clínica e RPC restrita para edição do próprio vínculo. |
| Analytics | Consultas agregadas no banco; sem trazer todos os pacientes/consultas ao navegador para calcular gráficos ou valores. Filtro de organização obrigatório. |

Agendamento e remarcação devem ser transações: verificar conflito, atualizar versão e gravar o evento juntos. Uma restrição de sobreposição no PostgreSQL para horários ativos do mesmo profissional evita dupla reserva em gravações simultâneas. O fluxo atual já usa `version` nas mudanças de status, mas grava o evento em uma chamada separada; antes de usar esses eventos nos indicadores, tornar a mudança de status e o respectivo evento atômicos. A remarcação deve seguir a mesma regra. As funções agregadas que permitem à equipe clínica ver totais de prontuários da clínica inteira devem validar o vínculo à organização sem devolver texto clínico.

### Dados e migrações, em ordem

1. Criar uma migração aditiva para `appointment_reschedules` com chaves e políticas RLS por organização. Incluir índices para `organization_id`, `appointment_id` e `occurred_at`; não inferir remarcações antigas a partir do horário atual.
2. Criar operações transacionais para criação, remarcação e mudança de status, preservando `version` e gravando auditoria/evento no mesmo commit. Impor não sobreposição por profissional para estados que ocupam agenda; deixar `CANCELLED` e `NO_SHOW` fora dessa restrição. A migração deve auditar dados existentes antes de ativar a restrição, para não falhar no deploy com conflitos históricos.
3. Criar agregações do dashboard com limites de período e autorização por organização. Dar atenção a consultas que mudam de status mais de uma vez, estornos, horários de verão do fuso configurado e ausência de preço.
4. Aproveitar `encounters` para rascunho/finalização; adicionar apenas índices ou regras faltantes após confrontar o esquema real. Adicionar à clínica os campos de contato necessários e proteger edição por papel.
5. Aplicar migrações primeiro em ambiente de teste, exercitar RLS com duas clínicas e só então publicar em produção; fazer o deploy da interface compatível com o esquema novo.

## Ordem de execução

1. **Fundação dos dados:** implementar as definições dos indicadores, corrigir cálculo por fuso, criar eventos de remarcação, checagem de conflitos e consultas agregadas. Verificar RLS e índices.
2. **Agenda:** calendário por intervalo, detalhe da consulta, remarcação e página `/agenda/novo` com data e hora separadas. Publicar após conferir conflitos e retorno ao período.
3. **Prontuário mínimo:** rascunho ligado à consulta, finalização pelo autor e contagem de pendências; conferir sigilo por papel e imutabilidade após encerramento.
4. **Dashboard:** cards, gráfico, próximas consultas e previsão financeira com dados reais da clínica inteira. Só então alterar o destino pós-login para `/dashboard`.
5. **Pacientes:** timeline e paginação, com navegação para o detalhe já implementado na etapa 2 e indicação de prontuário encerrado.
6. **Perfis:** edição do profissional e da clínica, permissões e atualização imediata da topbar/sidebar.
7. **Revisão integrada:** desktop/mobile, teclado e leitores de tela, fuso/virada de dia, transições de estado, papéis e isolamento entre clínicas, valores com e sem preço, estados vazios e deploy.

## Critérios de aceite indispensáveis

- Uma conta com clínica entra no dashboard; uma conta sem clínica vai ao onboarding; acessar `/` continua abrindo login.
- Pré-agendada e confirmada são distinguíveis no calendário e na lista das próximas consultas; clicar abre detalhes reais.
- Novo agendamento ocupa página própria e possui data e hora independentes; sobreposição do mesmo profissional é recusada sem criar registro parcial.
- Remarcação mantém a mesma consulta, registra horário anterior/novo e aparece uma vez nas métricas do período do evento.
- “Realizada” é a consulta concluída; “finalizada” exige prontuário encerrado pelo profissional responsável. O card de prontuários pendentes reconcilia as duas etapas sem expor conteúdo clínico a papéis indevidos.
- Linha do tempo do paciente mostra status e remarcações em ordem, abre detalhes e permite carregar histórico além dos 30 primeiros registros.
- Cards e gráfico reconciliam com os eventos do banco; previsão, a receber e recebido são apresentados separadamente e não contam cobranças duas vezes.
- Todos os indicadores e as próximas consultas abrangem a clínica inteira, sem filtro pessoal implícito.
- Médico edita apenas seus dados permitidos; somente administrador altera perfil da clínica; a topbar reflete a alteração.
- Todas as telas funcionam com zero pacientes/agendamentos, sem exemplos inventados. Nenhuma API expõe dados de outra clínica.

## Referências de implementação

- [FullCalendar React e vistas Standard](https://fullcalendar.io/docs/react); [licença Standard MIT e distinção Premium](https://fullcalendar.io/license).
- [DayPicker: campo de data e calendário acessível](https://daypicker.dev/guides/input-fields).
- [Supabase: dados do usuário e tabelas públicas protegidas por RLS](https://supabase.com/docs/guides/auth/managing-user-data); [atualização de metadados do usuário](https://supabase.com/docs/reference/javascript/auth-updateuser).
