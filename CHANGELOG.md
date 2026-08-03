# Changelog

## [2026-08-03] — Scaffold inicial do projeto Manda

- Criado projeto Vite + React 19 + TypeScript a partir do `prompt-claude-code-calorias.md`, portando 1:1 a lógica do protótipo `CalorieTracker.jsx` (design tokens, geração de dicas, resize de imagem, componentes de UI).
- Estrutura criada: `src/components` (GaugeBar, MacroPill, MealTicket, TipsCard, AddMealModal, SettingsModal), `src/lib` (types, tips, imageUtils, mealsApi, analyzeMeal, supabaseClient, constants), `src/pages` (Login, Home), `App.tsx` com guard de autenticação via Supabase Auth.
- `supabase/schema.sql` e `supabase/functions/analyze-meal/index.ts` (Edge Function proxy da Anthropic API) criados conforme especificado no `.md`.
- Decisão: Tailwind v4 (CSS-first, sem `tailwind.config.js`) em vez do v3 especificado originalmente no `.md` — decisão da Laísa.
- Decisão: Bun como package manager (padrão da Laísa), instalado via Homebrew nesta sessão (não estava presente na máquina).
- Decisão: modelo de IA atualizado de `claude-sonnet-4-6` (proposto no `.md`) para `claude-sonnet-5` (mais recente, preço promocional até 2026-08-31) — decisão da Laísa.
- Ícones do PWA (`public/icons/icon-192.png`, `icon-512.png`) gerados como placeholder simples (fundo escuro + "M" laranja) via Python/PIL — substituir por identidade visual definitiva antes do lançamento.
- Build (`bun run build`) e typecheck (`tsc -b`) validados sem erros.
- `.env` e `.env.local` adicionados ao `.gitignore` (não estavam cobertos no scaffold padrão do Vite).
- `git init` executado — repositório local criado, nenhum commit feito ainda.
- Subdomínio `manda-nutri.laisaandrade.com.br` criado no hPanel da Hostinger, apontando para a pasta `/manda-nutri`.

**Pendente (no fim do dia):**
- Substituir ícones placeholder por arte definitiva.
- Primeiro commit e push (nenhum código foi commitado ainda).

## [2026-08-03] — Projeto Supabase criado e configurado

- Projeto `manda-nutri` criado no Supabase via CLI, na mesma organização do `gestao-maternidades` (`nudrdavszhwnflvxospi`), região São Paulo (`sa-east-1`).
  - Reference ID: `frjpqndpfkukvzufaekb`
  - Dashboard: https://supabase.com/dashboard/project/frjpqndpfkukvzufaekb
- Senha do banco gerada aleatoriamente (32 caracteres) — salva em local seguro pela Laísa, referenciada em `.env` (nunca commitada).
- `supabase/schema.sql` aplicado no banco remoto via `supabase db query --linked`: tabelas `meals` e `daily_targets` criadas, RLS ativo em ambas, policies `usuario_ve_proprias_refeicoes` e `usuario_ve_proprias_metas` confirmadas.
- Secret `ANTHROPIC_API_KEY` configurado via `supabase secrets set` (fornecida pela Laísa, nunca escrita em arquivo do projeto).
- Edge Function `analyze-meal` deployada com sucesso (`supabase functions deploy`), mesmo sem Docker local rodando (deploy remoto direto).
- `.env` local criado com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e a senha do banco.
- **Correção de segurança:** a senha do banco tinha sido colada acidentalmente no `.env.example` (arquivo não coberto pelo `.gitignore`, ao contrário de `.env`). Removida de lá e movida para `.env` antes de qualquer commit.
- Redirect URL `https://manda-nutri.laisaandrade.com.br` adicionada manualmente em Authentication → URL Configuration no dashboard do Supabase (feito pela Laísa).

**Pendente:**
- Substituir ícones placeholder por arte definitiva.
- Primeiro commit e push (nenhum código foi commitado ainda).
- Testar fluxo ponta a ponta localmente (`bun run dev` com `.env` real): login por magic link → tirar foto → analisar → salvar → recarregar.
- Deploy do frontend (build + upload pra Hostinger).
