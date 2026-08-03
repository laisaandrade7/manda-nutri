import type { Targets, Totals } from './types';

export function generateTips(totals: Totals, targets: Targets): string[] {
  if (totals.calories === 0) {
    return ['Nenhuma refeição registrada ainda hoje. Bora começar pelo café da manhã?'];
  }
  const tips: string[] = [];
  const calPct = targets.calories ? totals.calories / targets.calories : 0;
  const protPct = targets.protein ? totals.protein / targets.protein : 0;

  if (protPct < 0.6) {
    tips.push(
      `Proteína ainda baixa (${Math.round(totals.protein)}g de ${targets.protein}g). Bom momento pra incluir ovos, frango, iogurte grego ou whey na próxima refeição.`
    );
  } else if (protPct >= 1) {
    tips.push(`Meta de proteína batida (${Math.round(totals.protein)}g) — ótimo suporte pro ganho de massa.`);
  }

  if (calPct > 1.1) {
    tips.push(
      `Calorias um pouco acima da meta hoje (${Math.round(totals.calories - targets.calories)} kcal a mais). Sem problema — o que importa é a média da semana, não um dia isolado.`
    );
  } else if (calPct < 0.7) {
    tips.push(
      `Ainda restam ${Math.round(targets.calories - totals.calories)} kcal hoje. Se bateu fome, é sinal pra comer — não pra pular refeição.`
    );
  }

  if (tips.length === 0) {
    tips.push('Bom equilíbrio entre calorias e macros hoje. Segue assim.');
  }
  return tips.slice(0, 3);
}
