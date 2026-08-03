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
        model: 'claude-sonnet-5',
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
