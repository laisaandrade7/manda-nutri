# Manda

App web (mobile-first, PWA) de contagem de calorias: tira foto da refeição (ou preenche manualmente), a IA identifica itens e estima macros — inclusive a partir de texto, com o botão "Recalcular com IA" —, você confirma/ajusta, e o app mantém histórico diário com metas de calorias/proteína/carboidrato/gordura e dicas contextuais.

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4
- **Backend (proxy da IA):** Supabase Edge Function (Deno)
- **Banco + Auth:** Supabase (Postgres + Auth via Google OAuth, restrito a uma conta)
- **PWA:** vite-plugin-pwa
- **Deploy frontend:** Hostinger (hospedagem compartilhada) — subdomínio `manda-nutri.laisaandrade.com.br`
- **IA:** Anthropic Claude (`claude-sonnet-5`) via Edge Function, nunca chamado direto do client

## Estrutura

```
manda-nutri/
├── supabase/
│   ├── schema.sql                    # tabelas meals + daily_targets, RLS
│   └── functions/analyze-meal/       # Edge Function — proxy Anthropic API
├── public/icons/                     # ícones PWA (placeholder atual)
├── src/
│   ├── components/                   # GaugeBar, MacroPill, MealTicket, TipsCard, AddMealModal, SettingsModal
│   ├── lib/                          # supabaseClient, imageUtils, tips, mealsApi, analyzeMeal, types, constants
│   ├── pages/                        # Login, Home
│   └── App.tsx                       # guard de autenticação
```

## Comandos

```bash
bun install       # instalar dependências
bun run dev       # servidor de desenvolvimento
bun run build     # build de produção (tsc -b && vite build)
bun run lint      # oxlint
```

## Setup local

1. Criar `.env` a partir de `.env.example` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
2. Rodar `supabase/schema.sql` no SQL Editor do projeto Supabase
3. `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
4. `supabase functions deploy analyze-meal`
5. Authentication → URL Configuration → adicionar `https://manda-nutri.laisaandrade.com.br` como Redirect URL

## Deploy

Ver `prompt-claude-code-calorias.md` (seção 10) para o passo a passo completo de deploy — build local + upload de `dist/` via FTP/File Manager pro subdomínio `manda-nutri.laisaandrade.com.br` (já criado no hPanel).
