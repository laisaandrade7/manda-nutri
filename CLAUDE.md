# Manda — Contexto do Projeto

App de contagem de calorias por foto (mobile-first, PWA). Ver `prompt-claude-code-calorias.md` na raiz para a spec completa original.

**Repositório:** https://github.com/laisaandrade7/manda-nutri (privado)

## Stack

- Frontend: React 19 + Vite 8 + TypeScript + Tailwind CSS v4 (CSS-first, sem `tailwind.config.js`)
- Backend IA: Supabase Edge Function (`supabase/functions/analyze-meal`), proxy pra Anthropic API (`claude-sonnet-5`)
- Banco/Auth: Supabase (Postgres + Auth via Google OAuth, restrito a `laisa.andrade7@gmail.com`)
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
- Provider Google OAuth configurado em Auth → Providers (Client ID/Secret do mesmo OAuth Client usado pelo dash-mq, no Google Cloud Console)
- Restrição de acesso: só `laisa.andrade7@gmail.com` (checado em `App.tsx`, constante `ALLOWED_EMAIL` em `src/lib/constants.ts`) — não é uma restrição do Supabase, é lógica do app

## Deploy

- Frontend: `bun run build` → `dist/` enviado via FTP (`lftp`) pro subdomínio `manda-nutri.laisaandrade.com.br` (Hostinger, hospedagem compartilhada, pasta `/manda-nutri`)
  - Credenciais FTP: mesma conta do `dash-mq` (`~/ai-agents/dash-mq/.env` → `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`)
  - Caminho remoto: `/domains/laisaandrade.com.br/public_html/manda-nutri`
  - Comando: `lftp -u "$FTP_USER,$FTP_PASSWORD" "$FTP_HOST" -e "set ssl:verify-certificate no; mirror -R --delete --verbose dist $FTP_REMOTE_PATH; bye"` (o `--delete` mantém o remoto sincronizado, sem arquivos órfãos de builds antigas)
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
- Ícones do PWA/favicon substituídos pela arte da mascote (Manda) — não são mais placeholder.
- COLORS.bg (token global de fundo) alterado pra `#16120F`, extraído do fundo da ilustração da mascote, pra ela se integrar sem borda visível.
- Projeto Supabase criado via CLI (não pelo dashboard web) — mais rápido, mesmo padrão usado em outros projetos da Laísa.
- Auth trocada de magic link (spec original) pra Google OAuth, restrito a `laisa.andrade7@gmail.com` — decisão da Laísa durante o teste local.
- Upload de foto: `capture="environment"` removido do input — sem isso, o navegador mobile abre a câmera direto e não deixa escolher da galeria.
- HEIC (padrão de foto do iPhone): tenta decodificação nativa primeiro (funciona no Safari/iOS), cai pro `heic2any` como fallback lazy-loaded só se precisar (evita inflar o bundle principal com uma lib de ~345KB que a maioria dos usuários não vai precisar).
- Edge Function `analyze-meal` aceita `{ base64 }` (foto) ou `{ texto }` (descrição) — usada tanto pra estimar refeição manual quanto pra recalcular itens já existentes, com botão "Recalcular com IA" no `AddMealModal`.
- Assets da mascote em `src/assets/`: `manda-mascote.png` (arte original 1024×1024, não usada diretamente na UI), `manda-avatar.webp` (crop de rosto) e `manda-hero.webp` (crop mais aberto, usado grande no login) — ambos WebP otimizados.

## Estado atual

Scaffold completo, build e typecheck passando. Projeto Supabase criado e configurado (schema, secret, Edge Function, Auth com Google OAuth + restrição de e-mail). Testado localmente (login, upload de foto) e deployado em produção (`manda-nutri.laisaandrade.com.br`, respondendo 200). Recálculo de calorias por IA (manual e correção pós-foto) implementado e testado em produção pela Laísa. Redesign visual com a mascote (Manda) implementado e testado localmente (login, empty state, tips card, ícones) — ainda não commitado nem deployado. Falta testar o fluxo completo (foto → análise → salvar) direto no iPhone.

**Cuidado:** nunca colar segredos reais (senhas, API keys) em `.env.example` — esse arquivo não é coberto pelo `.gitignore`. Segredos reais só em `.env`.
