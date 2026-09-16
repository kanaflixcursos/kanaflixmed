# Kanaflix MED

Plataforma de gestão para clínicas ambulatoriais: agenda, pacientes, atendimento e financeiro operacional.

## Documentação do projeto

- [Planejamento de produto](./PLANEJAMENTO-KANAFLIX-MED.md)
- [Plano técnico](./PLANO-TECNICO-GPT-ASTRA.md)
- [Prompt de execução no GPT Astra](./PROMPT-EXECUCAO-GPT-ASTRA.md)
- [Progresso](./docs/progress.md)

## Desenvolvimento local

```bash
pnpm install
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000). O arquivo `.env.local` precisa conter as variáveis do Supabase; use `.env.example` como referência.

## Supabase

O schema inicial está em `supabase/migrations/20260916150000_kanaflix_med_mvp.sql`. Ele foi aplicado no projeto Supabase `Kanaflix MED` e usa RLS para isolar organizações.

## Verificações

```bash
pnpm lint
pnpm build
```

O dashboard atual ainda usa dados demonstrativos enquanto autenticação e consultas protegidas do Supabase são conectadas.
