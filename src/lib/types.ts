export interface MealItem {
  nome: string;
  porcao: string;
  calorias: number;
  proteina: number;
  carboidrato: number;
  gordura: number;
}

export type MealType = 'cafe' | 'almoco' | 'lanche' | 'jantar';

export interface Meal {
  id?: string;
  mealType: MealType;
  time: string;
  description: string;
  items: MealItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function emptyItem(): MealItem {
  return { nome: '', porcao: '', calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 };
}

export function sumItems(items: MealItem[]): Totals {
  return items.reduce(
    (acc, it) => ({
      calories: acc.calories + (Number(it.calorias) || 0),
      protein: acc.protein + (Number(it.proteina) || 0),
      carbs: acc.carbs + (Number(it.carboidrato) || 0),
      fat: acc.fat + (Number(it.gordura) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function dateKeyFor(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(date: Date): string {
  const today = new Date();
  if (dateKeyFor(date) === dateKeyFor(today)) return 'Hoje';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateKeyFor(date) === dateKeyFor(yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}
