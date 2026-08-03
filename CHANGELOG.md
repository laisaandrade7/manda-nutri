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
- Testar fluxo ponta a ponta localmente (`bun run dev` com `.env` real): login por magic link → tirar foto → analisar → salvar → recarregar.
- Deploy do frontend (build + upload pra Hostinger).

## [2026-08-03] — Repositório GitHub criado

- Repositório privado `laisaandrade7/manda-nutri` criado via `gh repo create` e primeiro commit enviado (branch `main` rastreando `origin/main`).
- Confirmado antes do push: `.env` e `supabase/.temp/` (estado local do CLI) fora do commit; `.env.example` só com placeholders.

## [2026-08-03] — Autenticação trocada pra Google OAuth + testes locais

- **Decisão:** autenticação trocada de magic link (spec original) para login com Google OAuth — decisão da Laísa durante o teste local.
- `Login.tsx` reescrito para usar `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- Restrição de acesso implementada em `App.tsx`: só a conta `laisa.andrade7@gmail.com` (constante `ALLOWED_EMAIL` em `src/lib/constants.ts`) consegue entrar — qualquer outra conta Google é deslogada automaticamente com mensagem de acesso negado.
- Botão "Sair da conta" adicionado ao `SettingsModal` (não existia nenhuma forma de logout no app).
- Provider Google configurado manualmente no dashboard do Supabase (Client ID/Secret fornecidos pela Laísa, nunca escritos em arquivo do projeto) — feito pela Laísa.
- Redirect URI do Supabase (`https://frjpqndpfkukvzufaekb.supabase.co/auth/v1/callback`) adicionada no OAuth Client do Google Cloud Console (client compartilhado com o projeto dash-mq) — feito pela Laísa.
- Testado end-to-end com Playwright: login Google funcionando, app entra na Home corretamente.
- **Bug encontrado e corrigido:** upload de foto em formato HEIC (padrão do iPhone) falhava com erro genérico. Causa raiz: Chrome desktop não decodifica HEIC nativamente, e a lib `heic2any` (fallback) não suporta todas as variantes de HEIC (`ERR_LIBHEIF format not supported`). Corrigido em `src/lib/imageUtils.ts`: tenta decodificação nativa primeiro (funciona no Safari/iOS, que suporta HEIC nativamente), cai pro `heic2any` como fallback (lazy-loaded via `import()` dinâmico pra não inflar o bundle principal — o pacote é ~345KB), e mostra mensagem de erro específica se tudo falhar, em vez do erro genérico anterior.
- `AddMealModal.tsx`: erros agora mostram a mensagem real (`err.message`) quando disponível, em vez de sempre mascarar com o texto genérico de "confira sua conexão".
- **Bug encontrado e corrigido:** input de foto tinha `capture="environment"`, que força o navegador mobile a abrir direto a câmera, sem opção de escolher da galeria. Removido — agora mostra a escolha nativa entre câmera e galeria.
- Deploy do frontend feito via FTP (`lftp`) pra `manda-nutri.laisaandrade.com.br` (mesma conta Hostinger do `dash-mq`, credenciais reaproveitadas de `~/ai-agents/dash-mq/.env`). Dois redeploys feitos durante a sessão de testes (fix do capture + limpeza de arquivos órfãos com `mirror --delete`).
- Site em produção confirmado respondendo (HTTP 200).

**Pendente:**
- Testar fluxo completo no iPhone real: foto HEIC → análise → salvar → recarregar.
- Substituir ícones placeholder por arte definitiva.
