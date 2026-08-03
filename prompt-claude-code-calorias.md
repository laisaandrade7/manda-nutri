# Prompt para o Claude Code — App de Contagem de Calorias (Manda)

> Cole este documento inteiro no Claude Code junto com o arquivo de referência `CalorieTracker.jsx` (o protótipo já validado, gerado no Claude.ai). Objetivo: portar a lógica desse protótipo pra um projeto real — frontend estático na Hostinger (hospedagem compartilhada) + Supabase cuidando de banco, autenticação e da chamada segura pra IA.

---

## 1. Contexto e objetivo

App web (mobile-first, com PWA) chamado **Manda**: o usuário tira foto da refeição, a foto é analisada por IA (identifica itens, porções, calorias e macros), confirma/ajusta os valores, e o app mantém histórico diário com metas de calorias/proteína/carboidrato/gordura e dicas contextuais.

Já existe um protótipo funcional em React (arquivo anexo `CalorieTracker.jsx`) com toda a lógica de UI, cálculo de macros, geração de dicas e o prompt de análise de imagem prontos. **Não reinvente essa lógica — porte ela.** As únicas partes que mudam são a persistência (`window.storage` → Supabase) e a chamada da Anthropic API (que passa a ir pra uma Supabase Edge Function em vez de bater direto na API).

**Restrição importante:** o deploy do frontend é numa hospedagem compartilhada da Hostinger — ou seja, **só serve arquivos estáticos** (HTML/CSS/JS já compilados). Nada de servidor Node rodando lá. Toda lógica que precisa de servidor (esconder a API key da Anthropic, autenticação, banco) fica inteiramente no Supabase.

---

## 2. Stack técnica

| Camada | Tecnologia | Onde roda |
|---|---|---|
| Frontend | React 18 + Vite 5 + TypeScript + Tailwind CSS 3 | build estático (`dist/`), hospedado na Hostinger |
| Ícones | lucide-react | client |
| Backend (proxy da IA) | Supabase Edge Function (Deno) | Supabase, não na Hostinger |
| Banco de dados + Auth | Supabase (Postgres + Auth com magic link) | Supabase |
| PWA | vite-plugin-pwa | build estático |
| Deploy frontend | Hostinger (hospedagem compartilhada) via File Manager/FTP, ou Git deploy do hPanel | — |
| Deploy backend | Supabase CLI (`supabase functions deploy`) | — |

Nenhuma peça desse stack depende de rodar Node.js na Hostinger. O único requisito do lado da hospedagem é servir arquivos estáticos com HTTPS — o que qualquer plano compartilhado já faz.

---

## 3. Estrutura de pastas

```
calorie-tracker/
├── supabase/
│   ├── schema.sql
│   └── functions/
│       └── analyze-meal/
│           └── index.ts         # Edge Function — proxy Anthropic API
├── public/
│   ├── manifest.webmanifest
│   └── icons/                   # 192x192, 512x512
├── src/
│   ├── components/
│   │   ├── GaugeBar.tsx
│   │   ├── MacroPill.tsx
│   │   ├── MealTicket.tsx
│   │   ├── TipsCard.tsx
│   │   ├── AddMealModal.tsx
│   │   └── SettingsModal.tsx
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   ├── imageUtils.ts        # resize + base64 (portar de resizeImageToBase64)
│   │   ├── tips.ts              # generateTips (portar direto)
│   │   ├── mealsApi.ts          # CRUD de refeições/metas no Supabase
│   │   └── types.ts             # Meal, MealItem, Targets
│   ├── pages/
│   │   ├── Login.tsx
│   │   └── Home.tsx             # equivalente ao CalorieTracker atual
│   ├── App.tsx                  # guard de autenticação (sem sessão → Login, com sessão → Home)
│   ├── main.tsx
│   └── index.css
├── .env                         # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (build-time)
├── .env.example
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

Note que não existe mais pasta `/api` — a função que fala com a Anthropic mora em `supabase/functions/`, não no projeto Vite.

---

## 4. Schema do banco (Supabase / Postgres)

Rodar no SQL Editor do Supabase (sem mudanças em relação à primeira versão):

```sql
create extension if not exists "pgcrypto";

create table public.daily_targets (
  user_id uuid references auth.users(id) primary key,
  calories integer not null default 2000,
  protein integer not null default 150,
  carbs integer not null default 200,
  fat integer not null default 65,
  updated_at timestamptz default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  date date not null,
  meal_type text not null check (meal_type in ('cafe','almoco','lanche','jantar')),
  time text not null,               -- formato 'HH:MM'
  description text,
  items jsonb not null default '[]', -- [{nome, porcao, calorias, proteina, carboidrato, gordura}]
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  created_at timestamptz default now()
);

create index meals_user_date_idx on public.meals (user_id, date);

alter table public.meals enable row level security;
alter table public.daily_targets enable row level security;

create policy "usuario_ve_proprias_refeicoes" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "usuario_ve_proprias_metas" on public.daily_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## 5. Autenticação

- Supabase Auth com **magic link** (só e-mail, sem senha) — uso individual, só `ola@laisaandrade.com.br` precisa entrar.
- `src/pages/Login.tsx`: input de e-mail + botão, chama `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://SEU-DOMINIO-HOSTINGER' } })`.
- **Importante:** no Supabase Dashboard → Authentication → URL Configuration, adicionar o domínio final da Hostinger (ex: `https://calorias.laisaandrade.com.br`) na lista de Redirect URLs — sem isso o link mágico não retorna pro app.
- `App.tsx` verifica sessão via `supabase.auth.getSession()` / `onAuthStateChange`; sem sessão → `Login`; com sessão → `Home`. Como é uma página só (sem rotas internas), não precisa de react-router nem de configurar `.htaccess` pra SPA routing.

---

## 6. Edge Function (proxy da Anthropic API)

A Anthropic API nunca é chamada direto do navegador — o client chama a Edge Function `analyze-meal`, que roda no Supabase e mantém a `ANTHROPIC_API_KEY` só no servidor.

```ts
// supabase/functions/analyze-meal/index.ts
import { withSupabase } from 'npm:@supabase/server@^1'

const ANALYSIS_PROMPT = `Você é um assistente de nutrição especializado em estimar calorias e macronutrientes a partir de fotos de refeições, com boa familiaridade com pratos brasileiros.

Analise esta foto e:
1. Identifique cada alimento/item visível no prato.
2. Estime a porção de cada item (ex: "1 xícara", "150g", "2 unidades").
3. Estime calorias, proteína (g), carboidrato (g) e gordura (g) de cada item.
4. Indique seu nível de confiança geral: "baixa", "media" ou "alta".

Responda SOMENTE com um JSON válido, sem markdown, no formato:
{"descricao": "...", "itens": [{"nome": "...", "porcao": "...", "calorias": 0, "proteina": 0, "carboidrato": 0, "gordura": 0}], "confianca": "media"}

Se não der pra identificar comida na imagem, responda: {"erro": "motivo em uma frase"}`

interface AnalyzeMealBody {
  base64: string
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, _ctx) => {
    const { base64 }: AnalyzeMealBody = await req.json()
    if (!base64) {
      return Response.json({ error: 'Imagem ausente' }, { status: 400 })
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return Response.json({ error: data?.error?.message ?? 'Erro na Anthropic API' }, { status: 500 })
    }

    const textBlock = (data.content ?? []).find((b: any) => b.type === 'text')
    if (!textBlock) {
      return Response.json({ error: 'Resposta sem conteúdo de texto' }, { status: 500 })
    }

    const clean = textBlock.text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim()
    return Response.json(JSON.parse(clean))
  }),
}
```

Pontos técnicos importantes desse padrão (é o jeito atual recomendado pelo próprio Supabase pra Edge Functions):
- `withSupabase({ auth: 'user' }, ...)` já cuida de verificar o JWT do usuário logado e de CORS — não precisa escrever handler de `OPTIONS` na mão.
- Como o modo é `'user'` (padrão), não precisa mexer em `supabase/config.toml`.
- Import com especificador `npm:@supabase/server@^1`, nunca `Deno.serve` direto.

No client, `AddMealModal` chama a função assim (via `supabase-js`, que já anexa o JWT do usuário automaticamente):

```ts
const { data, error } = await supabase.functions.invoke('analyze-meal', {
  body: { base64 },
});
if (error) throw error;
// data já é o JSON parseado ({ descricao, itens, confianca } ou { erro })
```

---

## 7. Variáveis de ambiente

**No Supabase (secret da Edge Function, nunca no bundle do client):**
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

**No projeto Vite (`.env`, viram parte do bundle estático no build — tudo bem, são públicas por design):**
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
A `anon key` é segura de expor no client porque quem protege os dados de verdade é o RLS nas tabelas (seção 4), não o segredo dessa chave.

---

## 8. Lógica a portar 1:1 do protótipo

Do arquivo `CalorieTracker.jsx` anexo, reaproveitar sem reescrever:

- **Design tokens** (`COLORS`) e o conceito visual de "comanda de cozinha" (`MealTicket` com bordinha perfurada, rotação sutil, tipografia monoespaçada nos números).
- **`resizeImageToBase64`** → `src/lib/imageUtils.ts`, sem mudanças (continua usando `canvas` no client antes de enviar).
- **`generateTips`** → `src/lib/tips.ts`, sem mudanças na lógica (tom de apoio, foco em média semanal).
- **`sumItems`, `emptyItem`, `dateKeyFor`, `formatDisplayDate`** → `src/lib/types.ts`/`utils.ts`.
- **Componentes** `GaugeBar`, `MacroPill`, `MealTicket`, `TipsCard`, `AddMealModal`, `SettingsModal` → portar quase sem alteração. As únicas trocas reais de lógica:
  - `window.storage.get/set` → funções de `src/lib/mealsApi.ts` (Supabase).
  - a chamada de análise de foto dentro de `AddMealModal` → `supabase.functions.invoke('analyze-meal', ...)` em vez de `fetch` direto pra Anthropic.

`src/lib/mealsApi.ts` (substitui o `window.storage`):

```ts
export async function getDayMeals(userId: string, date: string) { /* select * from meals where user_id=userId and date=date */ }
export async function saveMeal(userId: string, meal: Meal) { /* upsert */ }
export async function deleteMeal(mealId: string) { /* delete */ }
export async function getTargets(userId: string) { /* select from daily_targets */ }
export async function saveTargets(userId: string, targets: Targets) { /* upsert */ }
```

---

## 9. PWA

`vite-plugin-pwa` no `vite.config.ts`:
- `manifest.name`: "Manda"
- `theme_color` / `background_color`: `#1C1A17`
- `display: "standalone"` — abre em tela cheia, tipo app nativo
- ícones 192x192 e 512x512

Isso é puramente estático — funciona igual em qualquer hospedagem compartilhada, sem exigência nenhuma do lado do servidor.

---

## 10. Passo a passo de deploy

**Backend (Supabase):**
1. Criar projeto no Supabase → rodar `supabase/schema.sql` no SQL Editor → copiar `Project URL` e `anon public key`.
2. Instalar a Supabase CLI, `supabase login`, `supabase link --project-ref <ref>`.
3. `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
4. `supabase functions deploy analyze-meal`
5. Authentication → URL Configuration → adicionar o domínio da Hostinger como Redirect URL.

**Frontend (Hostinger — hospedagem compartilhada):**
6. `.env` local com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` → `npm run build` → gera `dist/`.
7. Duas formas de publicar, escolha uma:
   - **Manual (funciona em qualquer plano):** enviar o conteúdo de `dist/` via File Manager ou FTP do hPanel pra um subdomínio (ex: `calorias.laisaandrade.com.br`) ou subpasta (ex: `laisaandrade.com.br/manda/`), seguindo o mesmo padrão que você já usa no `/dash-mq/`.
   - **Git deploy do hPanel (Avançado → Git, disponível nos planos Premium/Business):** aponta pra um repositório e puxa os arquivos automaticamente. Como esse recurso normalmente só copia arquivos (não roda `npm run build` de forma garantida), o caminho mais confiável é ter uma GitHub Action que builda o projeto e publica só a pasta `dist/` numa branch `deploy`, e apontar o Git deploy da Hostinger pra essa branch — assim você só dá `git push` e o site atualiza sozinho.
8. Testar ponta a ponta: abrir o domínio, login por magic link, tirar foto → analisar → salvar → recarregar a página e confirmar que persistiu.

---

## 11. Segurança

- RLS ativo nas duas tabelas — cada usuário só enxerga as próprias linhas, mesmo com a `anon key` sendo pública.
- `ANTHROPIC_API_KEY` só existe como secret da Edge Function no Supabase — nunca passa pelo build do Vite nem aparece no bundle servido pela Hostinger.
- A Edge Function usa `auth: 'user'`, ou seja, só aceita chamadas com um JWT válido de usuário logado — ninguém não-autenticado consegue gastar sua cota da API.
- Sem cadastro público — só quem receber o magic link no e-mail autorizado entra.

---

## 12. Observação sobre o plano da Hostinger

Se o seu plano específico não tiver a opção de Git no hPanel (ela existe a partir do Premium), o caminho manual (upload de `dist/` via File Manager/FTP) sempre funciona em qualquer plano compartilhado, sem exceção — é só um pouco mais manual a cada atualização.

---

**Anexo necessário:** enviar junto o arquivo `CalorieTracker.jsx` pro Claude Code usar como referência de UI/lógica ao criar os componentes.
