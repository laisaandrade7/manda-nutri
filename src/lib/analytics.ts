import type { MealWithDate } from './mealsApi';
import type { MealType, Targets } from './types';
import { dateKeyFor } from './types';

export interface DayTotal {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ADHERENCE_MIN = 0.8;
const ADHERENCE_MAX = 1.1;

export function groupByDay(meals: MealWithDate[]): DayTotal[] {
  const byDate = new Map<string, DayTotal>();
  for (const meal of meals) {
    const day = byDate.get(meal.date) ?? { date: meal.date, calories: 0, protein: 0, carbs: 0, fat: 0 };
    day.calories += Number(meal.calories) || 0;
    day.protein += Number(meal.protein) || 0;
    day.carbs += Number(meal.carbs) || 0;
    day.fat += Number(meal.fat) || 0;
    byDate.set(meal.date, day);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function calcAdherence(days: DayTotal[], targetCalories: number): number {
  if (days.length === 0 || targetCalories <= 0) return 0;
  const withinRange = days.filter((d) => {
    const pct = d.calories / targetCalories;
    return pct >= ADHERENCE_MIN && pct <= ADHERENCE_MAX;
  });
  return Math.round((withinRange.length / days.length) * 100);
}

export function calcCurrentStreak(allLoggedDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  // se hoje ainda não tem refeição registrada, começa a contar de ontem
  if (!allLoggedDates.has(dateKeyFor(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (allLoggedDates.has(dateKeyFor(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calcAverages(days: DayTotal[]): DayTotal {
  if (days.length === 0) return { date: '', calories: 0, protein: 0, carbs: 0, fat: 0 };
  const sum = days.reduce(
    (acc, d) => ({
      date: '',
      calories: acc.calories + d.calories,
      protein: acc.protein + d.protein,
      carbs: acc.carbs + d.carbs,
      fat: acc.fat + d.fat,
    }),
    { date: '', calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  return {
    date: '',
    calories: sum.calories / days.length,
    protein: sum.protein / days.length,
    carbs: sum.carbs / days.length,
    fat: sum.fat / days.length,
  };
}

export interface MealTypeShare {
  mealType: MealType;
  calories: number;
  pct: number;
}

export function calcMealTypeDistribution(meals: MealWithDate[]): MealTypeShare[] {
  const totalsByType = new Map<MealType, number>();
  let total = 0;
  for (const meal of meals) {
    const cal = Number(meal.calories) || 0;
    totalsByType.set(meal.mealType, (totalsByType.get(meal.mealType) ?? 0) + cal);
    total += cal;
  }
  const order: MealType[] = ['cafe', 'almoco', 'lanche', 'jantar'];
  return order.map((mealType) => {
    const calories = totalsByType.get(mealType) ?? 0;
    return { mealType, calories, pct: total > 0 ? (calories / total) * 100 : 0 };
  });
}

export interface WeekdayAverage {
  weekday: number;
  label: string;
  avgCalories: number;
}

export function calcWeekdayPattern(days: DayTotal[]): WeekdayAverage[] {
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const day of days) {
    const [y, m, d] = day.date.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    sums[weekday] += day.calories;
    counts[weekday] += 1;
  }
  return sums.map((sum, weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    avgCalories: counts[weekday] > 0 ? sum / counts[weekday] : 0,
  }));
}

export interface MostCaloricMeal {
  date: string;
  mealType: MealType;
  calories: number;
  description: string;
}

export function findExtremes(days: DayTotal[], meals: MealWithDate[]) {
  const highestDay = days.length > 0 ? days.reduce((a, b) => (b.calories > a.calories ? b : a)) : null;
  const lowestDay = days.length > 0 ? days.reduce((a, b) => (b.calories < a.calories ? b : a)) : null;
  const highestMeal: MostCaloricMeal | null =
    meals.length > 0
      ? meals.reduce((a, b) => ((Number(b.calories) || 0) > (Number(a.calories) || 0) ? b : a))
      : null;
  return {
    highestDay,
    lowestDay,
    highestMeal: highestMeal
      ? {
          date: highestMeal.date,
          mealType: highestMeal.mealType,
          calories: highestMeal.calories,
          description: highestMeal.description,
        }
      : null,
  };
}

export interface DashboardStats {
  days: DayTotal[];
  averages: DayTotal;
  adherencePct: number;
  streak: number;
  mealTypeDistribution: MealTypeShare[];
  weekdayPattern: WeekdayAverage[];
  extremes: ReturnType<typeof findExtremes>;
}

export function buildDashboardStats(
  meals: MealWithDate[],
  allLoggedDates: Set<string>,
  targets: Targets
): DashboardStats {
  const days = groupByDay(meals);
  return {
    days,
    averages: calcAverages(days),
    adherencePct: calcAdherence(days, targets.calories),
    streak: calcCurrentStreak(allLoggedDates),
    mealTypeDistribution: calcMealTypeDistribution(meals),
    weekdayPattern: calcWeekdayPattern(days),
    extremes: findExtremes(days, meals),
  };
}
