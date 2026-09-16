# Kanaflix MED — Planejamento de produto

**Versão:** 0.1  
**Data:** 16 de setembro de 2026  
**Status:** proposta inicial para validação

## 1. Visão do produto

O Kanaflix MED será uma plataforma web de gestão para consultórios e clínicas ambulatoriais privadas. O produto deve conectar, em um fluxo simples, as quatro tarefas que sustentam a operação diária:

1. agendar;
2. receber e localizar o paciente;
3. registrar o atendimento;
4. cobrar e acompanhar o resultado da clínica.

O posicionamento não é “ter mais funcionalidades”, e sim reduzir cliques, retrabalho e troca de ferramentas. O produto deve parecer fácil na primeira utilização, mesmo para uma clínica que hoje trabalha com agenda, papel e planilhas.

### Proposta de valor

> A rotina inteira da clínica, do agendamento ao recebimento, em um sistema simples de aprender e seguro para usar.

### Público inicial

- Consultórios individuais em crescimento.
- Clínicas particulares com 2 a 20 profissionais.
- Recepção centralizada e operação ambulatorial, sem internação.
- Atendimento predominantemente particular no primeiro lançamento.

### Premissa de escopo

O MVP terá vários profissionais por clínica e será preparado tecnicamente para várias unidades, mas a interface inicial operará com uma unidade principal. Convênios, TISS, estoque e regras avançadas de faturamento não entram no primeiro lançamento.

---

## 2. O que o mercado oferece e o que será simplificado

Feegow, HiDoctor, iClinic e Shosp convergem nos mesmos grandes módulos: agenda, prontuário, pacientes, financeiro, comunicação, relatórios, faturamento/TISS, estoque e telemedicina. Os produtos mais maduros acrescentam centenas de configurações e rotinas especializadas.

Para o Kanaflix MED, a redução proposta é:

| Mercado | Decisão para o Kanaflix MED |
| --- | --- |
| Dezenas de módulos na navegação | Seis áreas principais e Configurações |
| Agenda separada do atendimento e financeiro | Um agendamento inicia o check-in, atendimento e recebimento |
| Prontuário altamente configurável desde o início | Modelo clínico geral e estruturado, com campos livres e templates simples |
| Financeiro semelhante a sistema contábil | Caixa operacional: receitas, despesas, pendências e visão mensal |
| WhatsApp, SMS, e-mail e campanhas | Link manual no MVP; confirmação automatizada depois |
| TISS, TUSS e regras de convênio | Fora do MVP; trilha própria de desenvolvimento |
| Estoque e materiais | Fora do MVP |
| Telemedicina nativa | Fora do MVP; integração futura |
| IA, transcrição e resumo | Somente depois de segurança, consentimento e dados básicos maduros |
| Aplicativos desktop, mobile e modo offline | Web responsiva primeiro |

### Diferencial pretendido

- “Hoje” como centro operacional para médicos e recepção.
- Busca global realmente útil por paciente, telefone, CPF e agendamento.
- Uma única ficha do paciente, sem duplicar cadastro por profissional.
- Atendimento com salvamento automático e histórico cronológico legível.
- Financeiro ligado ao agendamento, sem exigir lançamento duplicado.
- Configuração inicial guiada, concluída em poucos minutos.

---

## 3. Princípios do produto

1. **O dia de trabalho começa em “Hoje”.** O usuário não deve montar o próprio fluxo navegando por vários módulos.
2. **Uma informação é registrada uma vez.** Cadastro, atendimento e recebimento compartilham o mesmo contexto.
3. **O prontuário é cronológico e rastreável.** Registros finalizados não são sobrescritos; correções são feitas por adendo.
4. **A interface revela complexidade aos poucos.** Opções avançadas aparecem somente quando necessárias.
5. **Cada papel vê o que precisa.** Recepção não recebe acesso clínico por conveniência; financeiro não acessa prontuário.
6. **Segurança faz parte da arquitetura.** Auditoria, isolamento entre clínicas e proteção de dados não são tarefas posteriores.
7. **Uma ação primária por página.** A regra do `DESIGN.md` é mantida em todo o produto.

---

## 4. Perfis e permissões

### Administrador da clínica

- Gerencia equipe, serviços, horários e configurações.
- Acessa indicadores operacionais e financeiros.
- Define permissões e política de acesso ao prontuário.
- Não recebe acesso clínico automático se não for profissional assistencial.

### Médico ou profissional de saúde

- Visualiza a própria agenda e pacientes autorizados.
- Inicia, salva e finaliza atendimentos.
- Emite documentos disponíveis para sua categoria profissional.
- Consulta histórico clínico conforme vínculo e regras da clínica.

### Recepção

- Cadastra pacientes e responsáveis.
- Agenda, confirma, remarca, cancela e realiza check-in.
- Registra cobranças e pagamentos quando autorizado.
- Vê alertas operacionais, mas não o conteúdo clínico.

### Financeiro

- Acessa receitas, despesas, contas, categorias e relatórios financeiros.
- Não acessa evolução clínica, hipóteses diagnósticas ou documentos médicos.

### Matriz inicial de acesso

| Área | Administrador | Profissional | Recepção | Financeiro |
| --- | :---: | :---: | :---: | :---: |
| Agenda geral | Sim | Própria/equipe autorizada | Sim | Consulta opcional |
| Cadastro demográfico | Sim | Sim | Sim | Dados mínimos |
| Prontuário clínico | Somente se autorizado | Sim | Não | Não |
| Cobranças do atendimento | Sim | Resumo opcional | Sim | Sim |
| Despesas e fluxo de caixa | Sim | Não por padrão | Não por padrão | Sim |
| Usuários e permissões | Sim | Não | Não | Não |
| Auditoria | Sim, com restrições | Próprios eventos | Não | Não |

Permissões devem ser avaliadas no servidor, e não apenas ocultadas na interface.

---

## 5. Arquitetura da informação

### Navegação principal

1. **Visão geral** — saúde operacional e financeira da clínica.
2. **Hoje** — fila do dia, chegadas, atrasos, atendimentos e pendências.
3. **Agenda** — calendário por profissional, serviço e sala.
4. **Pacientes** — cadastro, busca e histórico unificado.
5. **Financeiro** — recebimentos, pendências, despesas e caixa.
6. **Relatórios** — indicadores essenciais, sem construtor genérico no MVP.
7. **Configurações** — clínica, equipe, agenda, serviços, documentos e segurança.

### Busca global na topbar

Busca por:

- nome do paciente;
- telefone;
- CPF;
- número interno;
- profissional;
- agendamento futuro.

O resultado deve abrir em um painel leve e permitir criar um paciente somente quando não houver correspondência, reduzindo cadastros duplicados.

### Mapa de rotas sugerido

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

---

## 6. Escopo do MVP

### 6.1 Fundação, acesso e clínica

- Cadastro e login.
- Recuperação de senha.
- Clínica como workspace isolado.
- Convite de usuários por e-mail.
- Papéis: administrador, profissional, recepção e financeiro.
- Cadastro da clínica, logotipo, telefone, endereço e cor da marca.
- Cadastro de profissionais, especialidade, conselho e número profissional.
- Cadastro de serviços/procedimentos particulares com duração e preço padrão.
- Horários de atendimento por profissional.
- Registro de auditoria para acesso e alteração de dados sensíveis.

### 6.2 “Hoje”

Esta é a tela mais importante do produto.

- Lista cronológica dos agendamentos do dia.
- Filtros rápidos por profissional e status.
- Estados: agendado, confirmado, chegou, em atendimento, concluído, faltou e cancelado.
- Ações rápidas conforme o papel do usuário:
  - confirmar;
  - registrar chegada;
  - iniciar atendimento;
  - concluir;
  - receber pagamento;
  - reagendar.
- Indicadores discretos: próximos, aguardando, atrasados e pendentes de pagamento.
- Alertas de aniversário, cadastro incompleto e saldo pendente sem expor conteúdo clínico.

### 6.3 Agenda

- Visões por dia e semana.
- Colunas por profissional.
- Criação rápida de agendamento.
- Busca ou criação de paciente no próprio fluxo.
- Serviço, duração, valor sugerido, observação operacional e origem.
- Bloqueio de horário, intervalo e ausência do profissional.
- Reagendamento por edição; arrastar e soltar pode ficar para uma iteração posterior.
- Prevenção de conflito de profissional e sala.
- Lista de espera simples.
- Link de WhatsApp com mensagem preparada para confirmação, sem automação no MVP.

### 6.4 Pacientes

- Cadastro com nome social, nome civil quando necessário, data de nascimento, CPF opcional conforme contexto, contatos e endereço.
- Responsável legal e contato de emergência.
- Alertas administrativos e observações de recepção separados das notas clínicas.
- Detecção de possível duplicidade por nome, telefone, CPF e data de nascimento.
- Linha do tempo de agendamentos e atendimentos.
- Anexos de documentos e exames com tipo, data e autor.
- Exportação estruturada dos dados do paciente mediante fluxo autorizado.
- Inativação em vez de exclusão direta quando houver histórico relacionado.

### 6.5 Prontuário e atendimento

- Tela de atendimento aberta a partir de “Hoje” ou do paciente.
- Cabeçalho compacto com identificação, idade, alertas clínicos e último atendimento.
- Registro estruturado geral:
  - motivo da consulta;
  - anamnese/história;
  - antecedentes e alergias;
  - exame físico;
  - avaliação/hipótese;
  - conduta e plano;
  - observações.
- Sinais vitais opcionais.
- CID como campo opcional; catálogo e licenciamento devem ser verificados na implementação.
- Templates pessoais simples de texto.
- Salvamento automático de rascunho com indicação de estado.
- Finalização explícita do atendimento.
- Após finalização, conteúdo imutável e correções por adendo identificado, datado e auditado.
- Histórico clínico em ordem cronológica.
- Documentos básicos em PDF para impressão: receita simples, atestado, declaração e solicitação de exame.
- Assinatura digital ICP-Brasil e prescrição eletrônica interoperável ficam fora do MVP até integração e validação regulatória.

### 6.6 Financeiro operacional

- Geração de cobrança a partir do agendamento/atendimento.
- Receitas avulsas e despesas.
- Estados: pendente, parcial, pago, vencido, cancelado e estornado.
- Forma de pagamento: dinheiro, PIX, débito, crédito, transferência e outro.
- Parcelamento apenas como parcelas controladas internamente, sem adquirência no MVP.
- Categorias e contas/caixas.
- Fechamento diário simples.
- Visão de fluxo realizado e previsto.
- Filtros por período, profissional, serviço, categoria e situação.
- Exportação CSV.
- Sem conciliação bancária, NFS-e, maquininha ou contabilidade no MVP.

### 6.7 Relatórios essenciais

- Agendamentos por status e profissional.
- Taxa de faltas e cancelamentos.
- Pacientes novos e recorrentes.
- Receita recebida, prevista e em atraso.
- Despesas por categoria.
- Resultado operacional simples.
- Serviços mais realizados.
- Ocupação da agenda por profissional.

Cada relatório deve responder a uma pergunta concreta. Não haverá criador genérico de relatórios no MVP.

---

## 7. Fluxos principais

### 7.1 Agendar um paciente conhecido

```text
Agenda → Novo agendamento → buscar paciente → escolher profissional e serviço
→ sugerir horário/duração/valor → confirmar → aparecer em Hoje na data correta
```

Meta de experiência: concluir em menos de um minuto e sem abrir uma página separada de cadastro.

### 7.2 Agendar um paciente novo

```text
Novo agendamento → busca sem resultado → cadastro mínimo
→ telefone + nome + nascimento → agendar → completar cadastro depois
```

O sistema pede apenas o necessário naquele momento.

### 7.3 Receber e atender

```text
Hoje → Registrar chegada → profissional vê “aguardando”
→ Iniciar atendimento → salvar rascunho automaticamente
→ gerar documentos → Finalizar atendimento → cobrança fica disponível
```

### 7.4 Receber pagamento

```text
Hoje ou Financeiro → Abrir cobrança → confirmar valor e forma
→ registrar pagamento → emitir comprovante simples → atualizar caixa
```

### 7.5 Corrigir um registro finalizado

```text
Prontuário → registro finalizado → Adicionar adendo
→ justificar e registrar complemento → manter original intacto
```

### 7.6 Cancelar ou reagendar

```text
Agenda → abrir agendamento → Reagendar ou Cancelar
→ registrar motivo → preservar histórico → atualizar fila e financeiro
```

---

## 8. Direção de layout baseada no DESIGN.md

O `DESIGN.md` é a fonte visual e estrutural. O Kanaflix MED reutiliza o shell, os tokens, a tipografia e as regras de composição, adaptando somente entidades, rotas e conteúdo.

### Shell autenticado

- Sidebar fixa de 288 px no desktop.
- Topbar sticky de 80 px.
- Fundo geral `#F4F4F3`, superfícies brancas e cor de marca dinâmica.
- Google Sans Flex e ícones Lucide.
- Conteúdo principal em `max-w-7xl`; formulários em `max-w-3xl` ou `max-w-4xl`.
- Uma ação primária por página e nunca na topbar.

### Adaptação da sidebar

```text
[Logo Kanaflix MED]
[Clínica atual]

Visão geral
Hoje
Agenda
Pacientes
Financeiro
Relatórios

Configurações
Suporte
```

### Padrões de páginas

#### Visão geral

- Header editorial sem card.
- Quatro métricas: consultas hoje, ocupação, recebimentos do mês e pendências.
- Grade assimétrica com agenda resumida e alertas operacionais.
- Nenhuma informação clínica sensível no dashboard.

#### Hoje

- Header com data, profissional selecionado e ação “Novo agendamento”.
- Faixa de métricas compactas.
- Lista principal em um único card, dividida por linhas.
- Ações por item aparecem conforme estado e permissão.

#### Agenda

- Calendário é a superfície principal; filtros ficam acima, sem card excessivo.
- Novo agendamento abre painel lateral ou modal amplo, preservando o contexto do calendário.
- Em telas pequenas, usar lista diária empilhada em vez de comprimir a grade semanal.

#### Paciente

- Header com nome, status e ação operacional.
- Coluna lateral de 340 px para dados estáveis.
- Conteúdo principal com abas na URL: Resumo, Prontuário, Agendamentos, Financeiro e Arquivos.
- Abas e dados disponíveis variam por permissão.

#### Atendimento

- `max-w-7xl`, com resumo do paciente em coluna lateral e formulário clínico no conteúdo principal.
- Seções longas em poucos cards grandes, evitando um card por campo.
- Barra de estado informa “Rascunho salvo” ou “Não salvo”.
- Ação primária “Finalizar atendimento”; salvar rascunho é automático.

#### Financeiro

- Resumo mensal com quatro métricas.
- Filtros em superfície leve.
- Lista unificada de movimentos, com receitas e despesas identificadas por label e ícone, não apenas por cor.

### Responsividade

- Mobile prioriza “Hoje”, busca de paciente e ações rápidas.
- Agenda semanal vira agenda do dia.
- Tabelas viram linhas empilhadas.
- Prontuário mantém leitura linear em uma coluna.
- Nenhuma função crítica depende de hover.

---

## 9. Modelo de dados conceitual

```text
Organization
├── Location
├── UserMembership ── User
├── ProfessionalProfile
├── Service
├── ScheduleRule
├── Room
├── Patient
│   ├── PatientContact / ResponsibleParty
│   ├── PatientAlert
│   ├── PatientFile
│   └── ConsentRecord
├── Appointment
│   ├── AppointmentStatusHistory
│   └── Charge
├── Encounter
│   ├── ClinicalEntry
│   ├── VitalSign
│   ├── ClinicalDocument
│   └── Addendum
├── FinancialTransaction
│   ├── Payment
│   └── FinancialCategory
└── AuditEvent
```

### Regras essenciais de dados

- Toda entidade operacional carrega `organization_id`.
- Identificadores públicos não devem ser sequenciais ou previsíveis.
- Paciente é único dentro da clínica, não dentro da agenda de cada profissional.
- Mudanças de status mantêm histórico, autor e horário.
- Entrada clínica finalizada nunca sofre atualização destrutiva.
- Exclusões administrativas relevantes são lógicas e auditadas.
- Arquivos ficam em armazenamento privado, com acesso temporário e autorizado.
- Auditoria não armazena conteúdo clínico desnecessário; registra quem, quando, qual ação e qual recurso.

---

## 10. Arquitetura técnica recomendada

### Aplicação

- Next.js 16.2 com App Router.
- React 19.2.
- TypeScript estrito.
- Tailwind CSS 4 com os tokens semânticos do `DESIGN.md`.
- Google Sans Flex, Lucide React e Framer Motion.

### Backend e dados

- Monólito modular no início, evitando microserviços prematuros.
- PostgreSQL como banco transacional.
- Camada de acesso com suporte explícito a transações e escopo por organização.
- Armazenamento de objetos compatível com S3 para anexos.
- Fila de trabalhos para e-mails, PDFs, exportações e futuras mensagens.
- Cache somente onde houver necessidade medida.

### Isolamento e segurança

- Middleware de autenticação e autorização no servidor.
- Escopo de organização obrigatório em todas as consultas.
- Defesa adicional no banco, como Row-Level Security, se compatível com a camada escolhida.
- TLS em trânsito e criptografia em repouso.
- Backups automáticos, criptografados e com teste periódico de restauração.
- Segredos fora do repositório.
- MFA inicialmente obrigatório para administradores e recomendado para profissionais; evoluir para todos os perfis sensíveis.
- Sessões revogáveis e encerramento remoto.
- Limitação de tentativas e alertas de acesso anômalo.
- Logs de aplicação sem dados clínicos ou documentos.
- Ambientes de desenvolvimento e homologação com dados sintéticos.

### Observabilidade

- Erros centralizados com remoção de dados pessoais.
- Métricas de latência, falha de jobs, autenticação e uso de armazenamento.
- Alertas para indisponibilidade, falha de backup e comportamento de acesso suspeito.
- Trilhas diferentes para log técnico e auditoria de negócio.

---

## 11. LGPD, prontuário e requisitos regulatórios

Dados de saúde são dados pessoais sensíveis pela LGPD. A plataforma precisa nascer com privacidade e segurança desde a concepção, incluindo finalidade, minimização, controle de acesso, rastreabilidade e resposta a incidentes.

### Requisitos desde o MVP

- Mapeamento de controlador, operador, suboperadores e responsabilidades contratuais.
- Registro da hipótese legal por finalidade; não tratar consentimento como solução genérica para tudo.
- Termos, política de privacidade e canal para direitos do titular.
- Inventário de tratamento e política de retenção.
- Exportação e atendimento de solicitações com validação de identidade.
- Registro de consentimentos específicos quando aplicáveis.
- Plano de resposta a incidentes e registro interno.
- Controle por menor privilégio e revisão periódica de acessos.
- Auditoria de leitura, criação, alteração, exportação e impressão de prontuário.
- Processo de desligamento de usuário com revogação imediata.
- Contratos e avaliação de fornecedores que processem dados sensíveis.

### Prontuário eletrônico

A Resolução CFM nº 1.821/2007, a legislação posterior e os requisitos SBIS para S-RES devem orientar requisitos de integridade, autoria, assinatura, guarda e eliminação do papel. O desenho definitivo deve ser revisado por assessoria jurídica e por especialista em certificação SBIS antes de prometer prontuário sem papel ou equivalência a NGS2.

### Incidentes

A Resolução CD/ANPD nº 15/2024 prevê comunicação de incidentes relevantes à ANPD e aos titulares, além de registro dos incidentes. O produto deve oferecer evidência suficiente para investigar eventos e executar esse processo.

### Observação importante

Este documento é planejamento de produto, não parecer jurídico ou certificação. Antes do piloto com dados reais, deve haver revisão jurídica, revisão de segurança e definição formal da categoria profissional atendida.

---

## 12. Fora do MVP e evolução

### Fase seguinte — eficiência da operação

- Confirmação automática via WhatsApp oficial.
- Agendamento online público.
- Regras de repasse por profissional.
- Orçamentos e pacotes de procedimentos.
- Templates clínicos por especialidade.
- Integração de assinatura digital e prescrição eletrônica.
- Importação assistida de pacientes e agenda.
- Segunda unidade na interface.
- Pesquisa de satisfação.

### Fase de clínicas com convênios

- Convênios, planos e elegibilidade.
- TUSS, guias e lotes TISS.
- Glosas e contas a receber de operadoras.
- Autorizações e anexos.
- Regras de faturamento e repasse mais avançadas.

### Fase de expansão

- Estoque e consumo de materiais.
- NFS-e e integração de pagamentos.
- Portal do paciente.
- Telemedicina.
- Aplicativo móvel ou PWA com estratégia offline controlada.
- API e webhooks.
- IA para documentação clínica somente com governança, consentimento quando aplicável, revisão humana e contratos adequados.

---

## 13. Fases de execução

As fases abaixo são marcos de produto, não estimativas contratuais. A duração depende do tamanho da equipe, integrações e exigências de conformidade.

### Fase 0 — Descoberta e validação

Entregáveis:

- Entrevistas com ao menos médicos, recepcionistas e gestores de clínicas pequenas.
- Mapeamento do fluxo real de agendamento, chegada, atendimento e cobrança.
- Definição das categorias profissionais iniciais.
- Matriz de permissões validada.
- Política inicial de dados e avaliação jurídica.
- Protótipo navegável dos cinco fluxos principais.
- Backlog priorizado com critérios de aceite.

### Fase 1 — Fundação e agenda

- Design system e shell.
- Autenticação, clínica, usuários e papéis.
- Pacientes e prevenção de duplicidade.
- Serviços, profissionais e disponibilidade.
- Agenda e tela “Hoje”.
- Auditoria inicial.

### Fase 2 — Atendimento clínico

- Encounter e prontuário cronológico.
- Rascunho, salvamento automático, finalização e adendo.
- Anexos e documentos básicos.
- Permissões clínicas e trilha de acesso.

### Fase 3 — Financeiro e relatórios

- Cobranças, pagamentos, despesas e fechamento diário.
- Visão geral e relatórios essenciais.
- Exportações.

### Fase 4 — Hardening e piloto

- Testes de carga e concorrência em agenda.
- Pentest e correções.
- Teste de restauração de backup.
- Exercício de incidente.
- Revisão jurídica e de privacidade.
- Migração piloto com dados controlados.
- Piloto acompanhado em uma ou duas clínicas.

### Fase 5 — Lançamento controlado

- Onboarding guiado.
- Suporte e base de conhecimento.
- Métricas de adoção e funil.
- Plano de rollback e suporte a incidentes.
- Expansão gradual de clientes.

---

## 14. Critérios de aceite do MVP

O MVP está pronto para piloto quando:

- Uma recepcionista agenda, confirma, faz check-in e recebe sem apoio técnico.
- Um profissional abre “Hoje”, atende, finaliza e consulta o histórico.
- Uma cobrança nasce do agendamento sem lançamento duplicado.
- Um usuário sem permissão não consegue obter conteúdo clínico nem por URL/API.
- Uma alteração de status e todo acesso sensível relevante deixam trilha de auditoria.
- Um atendimento finalizado não pode ser sobrescrito.
- Um backup foi restaurado com sucesso em ambiente isolado.
- O sistema funciona nos fluxos críticos em desktop e mobile.
- Exportações não misturam dados de clínicas diferentes.
- A equipe consegue investigar um incidente simulado.
- A documentação jurídica e os contratos mínimos estão aprovados.

---

## 15. Métricas de sucesso

### Ativação

- Tempo entre cadastro e primeiro agendamento.
- Percentual de clínicas que configuram profissional, serviço e agenda.
- Percentual que conclui o primeiro atendimento.

### Eficiência

- Tempo mediano para criar agendamento.
- Cliques/etapas para check-in, iniciar atendimento e registrar pagamento.
- Percentual de cobranças geradas automaticamente pelo fluxo.
- Cadastros duplicados detectados e evitados.

### Adoção

- Usuários ativos por papel.
- Clínicas que usam “Hoje” diariamente.
- Atendimentos finalizados por semana.
- Percentual de agenda gerenciada no sistema.

### Qualidade e confiança

- Taxa de erro nos fluxos críticos.
- Falhas de salvamento de rascunho.
- Tempo de resposta p95.
- Incidentes por severidade.
- Sucesso dos backups e testes de restauração.

### Resultado da clínica

- Redução de faltas após automação de confirmação.
- Pendências financeiras identificadas.
- Tempo entre atendimento e pagamento.
- Ocupação da agenda.

---

## 16. Riscos principais

| Risco | Mitigação proposta |
| --- | --- |
| Escopo crescer para “copiar o Feegow” | Backlog separado e regra explícita de não incluir TISS, estoque, telemedicina e IA no MVP |
| Vazamento entre clínicas | Escopo por organização no servidor, testes automatizados e defesa no banco |
| Permissões clínicas permissivas demais | Matriz por papel, menor privilégio e teste de autorização por endpoint |
| Perda de texto durante atendimento | Autosave local/servidor, estado visível e recuperação de rascunho |
| Prontuário alterável sem rastreio | Finalização imutável, adendo e auditoria |
| Cadastros duplicados | Busca antecipada e alerta de similaridade |
| Agenda com conflitos | Regra transacional e restrição de concorrência |
| Financeiro virar contabilidade | Manter escopo de caixa operacional e exportação |
| Dependência de WhatsApp ou prescrição | Integrações desacopladas e alternativas manuais no núcleo |
| Promessa regulatória inadequada | Revisão jurídica/SBIS antes do piloto e comunicação comercial precisa |

---

## 17. Decisões que precisam de validação antes do design detalhado

1. O lançamento será somente para médicos ou também para psicólogos, dentistas, fisioterapeutas e outros profissionais?
2. O primeiro público usa principalmente atendimento particular ou convênios são indispensáveis já no piloto?
3. A clínica piloto tem uma ou mais unidades?
4. Recepção poderá registrar pagamentos ou haverá caixa separado?
5. Profissionais podem ver o prontuário uns dos outros por padrão ou somente com vínculo explícito?
6. Quais documentos clínicos são realmente necessários na primeira especialidade?
7. Há necessidade de importação de sistema anterior? Em quais formatos?
8. O Kanaflix MED será vendido por profissional, por clínica ou por faixa de uso?
9. O produto terá suporte a outras marcas/workspaces ou usará identidade única Kanaflix MED?

---

## 18. Próximo passo recomendado

Antes de escrever código, transformar este plano em três artefatos:

1. **Mapa de jornadas** de recepção, profissional e gestor.
2. **Protótipo navegável** de Hoje, Agenda, Paciente, Atendimento e Financeiro.
3. **Backlog do MVP** com histórias, critérios de aceite, riscos e dependências.

O protótipo deve ser testado com usuários reais. O objetivo é descobrir se cada pessoa sabe onde começar e consegue completar os fluxos sem explicação.

---

## 19. Fontes consultadas

- [Feegow — gestão para clínicas e consultórios](https://feegowclinic.com.br/)
- [HiDoctor — recursos da plataforma](https://hidoctor.com.br/)
- [iClinic — sistema médico](https://iclinic.com.br/sistema-medico/)
- [iClinic — gestão financeira](https://iclinic.com.br/funcionalidades/gestao-financeira/)
- [Shosp — sistema para clínicas](https://shosp.com.br/sistema-para-clinicas)
- [Lei Geral de Proteção de Dados — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [ANPD — Regulamento de Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca)
- [CFM — Resolução nº 1.821/2007](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821)
- [SBIS — manuais e requisitos de certificação S-RES](https://sbis.org.br/certificacoes/certificacao-software/manuais-e-listas-de-requisitos/)

