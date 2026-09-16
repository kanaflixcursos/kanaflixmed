# Prompt de execução — Kanaflix MED no GPT-6 Astra

Use este texto ao abrir uma tarefa do GPT-6 Astra na pasta do projeto.

```text
Implemente o Kanaflix MED neste repositório seguindo, nesta ordem:

1. C:\Users\rodri\OneDrive\Documentos\ChatGPT\Kanaflix MED\PLANO-TECNICO-GPT-ASTRA.md
2. C:\Users\rodri\OneDrive\Documentos\ChatGPT\Kanaflix MED\PLANEJAMENTO-KANAFLIX-MED.md
3. C:\Users\rodri\OneDrive\Desktop\DESIGN.md

Leia os três documentos por completo antes de editar. Inspecione também AGENTS.md, skills aplicáveis, o estado do Git e todos os arquivos existentes. Preserve mudanças do usuário.

Seu objetivo é executar o plano, não produzir outro planejamento. Se o repositório estiver vazio, comece pela Fase 0. Trabalhe autonomamente até concluir a fase atual com código executável, migrations, testes e documentação. Faça suposições reversíveis quando o contexto permitir e registre decisões arquiteturais em docs/adr/. Só pare para perguntar quando uma escolha mudar materialmente segurança, escopo ou arquitetura, ou quando faltar uma credencial externa indispensável para a fase.

Mantenha docs/progress.md atualizado. Não avance deixando falhas críticas, isolamento de tenant incompleto ou testes de segurança desativados. Não use dados reais em desenvolvimento. Nunca confie em organization_id vindo do cliente, nunca exponha conteúdo clínico em logs e nunca permita que um prontuário finalizado seja sobrescrito.

Siga o DESIGN.md fielmente: Google Sans Flex, tokens semânticos, sidebar de 288 px, topbar de 80 px, uma ação primária por página, cards e campos com os raios definidos, Lucide como única biblioteca de ícones, animações discretas e responsividade mobile.

Ao terminar a fase, rode as verificações exigidas no plano e entregue um relatório com: o que foi implementado, arquivos principais, migrations, ADRs, testes executados, como tenancy/permissões foram verificadas, pendências reais e próximo passo. Não declare o sistema pronto para dados reais antes da Fase 7 e dos gates jurídicos e operacionais.

Use raciocínio high nas fases 0, 1, 4 e 7; medium nas demais, aumentando apenas quando a complexidade justificar. Comunique-se em português de forma direta. Se subagentes estiverem disponíveis e as instruções do ambiente permitirem, use-os apenas para tarefas independentes que não editem os mesmos arquivos.
```

## Prompts para continuar por fase

Depois da primeira execução, use:

```text
Continue o Kanaflix MED a partir de docs/progress.md. Leia novamente o plano técnico e implemente a próxima fase incompleta por inteiro. Preserve o que já funciona, cumpra o gate da fase, execute os testes exigidos e atualize o relatório de progresso.
```

Para uma revisão antes de avançar:

```text
Audite a fase atual do Kanaflix MED contra PLANO-TECNICO-GPT-ASTRA.md. Verifique funcionalidade, arquitetura, migrations, autorização, RLS, auditoria, logs, responsividade e testes. Corrija os problemas encontrados, rode as verificações relevantes e atualize docs/progress.md. Não inicie a fase seguinte nesta tarefa.
```

Para o gate de piloto:

```text
Execute o gate técnico de piloto da Fase 7 do Kanaflix MED. Não presuma aprovação jurídica ou operacional. Verifique e documente isolamento cross-tenant, permissões clínicas, imutabilidade do prontuário, idempotência financeira, MFA, uploads, logs, restauração, runbooks, pentest, acessibilidade, desempenho e fluxos E2E. Corrija o que estiver dentro do repositório e liste separadamente os gates externos ainda pendentes.
```

Referência de comportamento do modelo: [OpenAI — Using GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model).

