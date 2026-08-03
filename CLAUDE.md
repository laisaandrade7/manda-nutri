# Manda — Contexto do Projeto

App de contagem de calorias por foto (mobile-first, PWA). Ver `prompt-claude-code-calorias.md` na raiz para a spec completa original.

**Repositório:** https://github.com/laisaandrade7/manda-nutri (privado)

## Stack

- Frontend: React 19 + Vite 8 + TypeScript + Tailwind CSS v4 (CSS-first, sem `tailwind.config.js`)
- Backend IA: Supabase Edge Function (`supabase/functions/analyze-meal`), proxy pra Anthropic API (`claude-sonnet-5`)
- Banco/Auth: Supabase (Postgres + Auth via magic link, sem senha)
- PWA: vite-plugin-pwa
- Package manager: Bun

## Comandos

```bash
bun install
bun run dev
bun run build      # tsc -b && vite build
bun run lint        # oxlint
```

## Projeto Supabase

- Nome: `manda-nutri` · Reference ID: `frjpqndpfkukvzufaekb` · Região: São Paulo (`sa-east-1`)
- Organização: `nudrdavszhwnflvxospi` (mesma do `gestao-maternidades`)
- Dashboard: https://supabase.com/dashboard/project/frjpqndpfkukvzufaekb
- Schema (`meals`, `daily_targets`, RLS + policies) já aplicado no banco remoto
- Edge Function `analyze-meal` já deployada
- Redirect URL `https://manda-nutri.laisaandrade.com.br` já configurada em Auth

## Deploy

- Frontend: build estático (`dist/`) enviado via FTP/File Manager pro subdomínio `manda-nutri.laisaandrade.com.br` (Hostinger, hospedagem compartilhada, pasta `/manda-nutri` — já criado no hPanel)
- Backend: `supabase functions deploy analyze-meal --project-ref frjpqndpfkukvzufaekb` + `supabase secrets set ANTHROPIC_API_KEY=... --project-ref frjpqndpfkukvzufaekb`
- Nunca fazer deploy sem `git status` limpo e sem pedir confirmação explícita antes do FTP/push (regra global da Laísa)

## Variáveis de ambiente

`.env` (não commitado, já criado localmente com credenciais reais — ver `.env.example` pro formato):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_DB_PASSWORD` (referência apenas, não usada pelo frontend)

Secret do Supabase (nunca no bundle do client, já configurado):
- `ANTHROPIC_API_KEY`

## Decisões tomadas

- Tailwind v4 em vez de v3 (spec original pedia v3) — escolha da Laísa por ser o padrão atual.
- Modelo Anthropic `claude-sonnet-5` em vez de `claude-sonnet-4-6` (spec original) — mais novo e com preço promocional.
- Ícones do PWA são placeholder — substituir antes do lançamento real.
- Projeto Supabase criado via CLI (não pelo dashboard web) — mais rápido, mesmo padrão usado em outros projetos da Laísa.

## Estado atual

Scaffold completo, build e typecheck passando. Projeto Supabase criado e configurado (schema, secret, Edge Function, Auth redirect URL). Ainda sem `.env.local` de exemplo atualizado além do já feito, sem commits, sem deploy do frontend.

**Cuidado:** nunca colar segredos reais (senhas, API keys) em `.env.example` — esse arquivo não é coberto pelo `.gitignore`. Segredos reais só em `.env`.
