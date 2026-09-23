# Central Clínica — sistema visual

## Conceito

Uma central de trabalho para profissionais de saúde: clara, acolhedora e organizada. Referência visual: HSAZw2TaQAA2eKQ.jpg, enviada pelo usuário. Adotamos sua atmosfera azul-clara, navegação lateral branca, tipografia azul-marinho, ícones lineares e painéis arredondados. A identidade é própria: símbolo de pulso cardíaco, nome Central Clínica e assinatura “Cuidado em cada conexão”.

Este documento substitui a direção anterior do Kanaflix MED baseada no DESIGN.md de CRM. A implementação de referência está em `src/app/globals.css`, `src/components/clinical-shell.tsx` e `src/components/auth-visual.tsx`.

## Cores

| Token | Valor | Aplicação |
| --- | --- | --- |
| background | #EFF6FD | Fundo azul-gelo |
| foreground | #14284B | Títulos e texto principal |
| surface | #FFFFFF | Cards, formulários e navegação |
| surface-muted | #F1F7FD | Campos e áreas secundárias |
| muted-foreground | #60728C | Legendas e descrição |
| border | #E0EAF5 | Divisores discretos |
| brand | #1765DF | Botões, links e seleção |
| success | #087F74 | Concluído e confirmação |
| warning | #A76000 | Pendências e atenção |
| danger | #BF2C2C | Erros e ações destrutivas |

Tema claro deliberado, independente da preferência do sistema. Azul suave e gradientes restritos às áreas de acolhimento, marca e fundo. Sem cores de marketing competindo com dados clínicos. Status sempre incluem texto.

## Estrutura

- Sidebar desktop fixa de 252px, branca translúcida, borda direita suave; logo no topo, seção de gestão e navegação com altura confortável. Item ativo azul sobre fundo azul-claro. Navegação: Dashboard, Agenda, Pacientes e Financeiro.
- Rodapé lateral com nome real da clínica e mensagem de cuidado. Não inventar dados de profissionais, unidades ou pacientes.
- Topbar de 80px, com contexto da página, usuário real e ação de sair. No mobile, 68px e botão para abrir navegação. Não exibir notificações, busca global ou controles sem implementação.
- Área de trabalho com 32px de respiro no desktop e 16px lateral no mobile. Conteúdo máximo de 1440px. Título de 27–36px com descrição curta e ação primária por página.
- Sidebar móvel com backdrop, botão de fechar e navegação que fecha ao selecionar uma rota.

## Tipografia e iconografia

Google Sans Flex Variable em todo o produto. Texto principal 14px; metadados 11–12px; títulos de cards 16–18px. Peso 400 no corpo, 500–650 nos títulos. Tracking discretamente negativo apenas nos títulos e na marca.

Lucide como biblioteca única. Ícones de navegação 20px com traço 1.7; ações 16–20px. Ícones de seção podem ocupar caixas azuis, lilases ou verdes suaves. Símbolo da marca: HeartPulse branco em quadrado azul com raio orgânico. Ilustração de autenticação feita com formas CSS e ícones vetoriais de saúde.

## Componentes

Cards operacionais: raio 18px, borda de 1px e sombra `0 4px 22px #3475b906`. Agrupar informação relacionada, sem colocar cada linha num card. Formulários e botões: raio 10–12px, altura de 44–48px para ações principais. Badges: cápsulas compactas com descrição legível. Tabelas/listas: separadores leves e espaçamento regular. Empty states devem convidar à ação com informação real; nunca preencher telas com pacientes ou valores fictícios.

## Acesso e configuração

Login e cadastro têm moldura branca com raio 28px sobre fundo azul-gelo, máximo de 1160px. Desktop em duas colunas: acolhimento visual à esquerda, formulário à direita. Painel visual com marca, mensagem clínica, pulso e estetoscópio; sem métricas simuladas. Mobile mostra formulário em uma coluna, marca e campos confortáveis.

A home `/` continua levando sempre a `/login`. Não há link separado “Primeiro acesso” no login. Autenticação leva à configuração quando não existe clínica; caso contrário ao dashboard. Cadastro e configuração são etapas do mesmo acesso profissional. A configuração usa o vocabulário “clínica” e “ambiente”, evitando jargão técnico.

## Telas operacionais

- Dashboard: indicadores da clínica inteira por dia, semana e mês; próximos atendimentos e resumo financeiro só para os papéis autorizados. Consultas concluídas e prontuários encerrados têm métricas separadas.
- Agenda: calendário por dia, semana e mês; estados usam texto e cor; seleção de horário abre página própria para novo agendamento. Conflitos de horário são verificados no servidor.
- Pacientes: busca, cadastro, edição e estado vazio dentro da nova estrutura. Detalhe separa próximas consultas e histórico em timeline, com navegação para cada consulta.
- Consulta e prontuário: detalhes operacionais e histórico de status/remarcação. O prontuário fica disponível ao profissional responsável; depois de encerrado passa à leitura.
- Perfis: dados profissionais editáveis pelo próprio usuário; dados da clínica editáveis apenas por administrador.
- Financeiro: cards de saldo e lista de cobranças; ação de recebimento com escolha de forma. A nova aparência não muda regras de cálculo.
- Configuração inicial: formulário focado em nome da clínica e profissional com a mesma paleta azul, bordas e tipografia. O acesso com clínica ativa abre o dashboard.

## Acessibilidade e comportamento

Manter labels, foco visível de 3px, contraste de texto e nomes acessíveis nos botões de ícone. Link para pular ao conteúdo. Reflow de cards e formulários em telas pequenas. Erros devem ser legíveis; estados de carregamento não podem simular dados. Respeitar prefers-reduced-motion. Não adicionar IA, clima, prontuário ou gráficos sem funcionalidade e dados próprios.

## Marca e publicação

Nome público: Central Clínica em todas as telas e metadados. Identificadores técnicos, repositório e domínio existentes permanecem por compatibilidade; mudança de domínio ou nome do provedor OAuth é uma etapa de infraestrutura separada. A documentação histórica mantém contexto dos nomes anteriores.
