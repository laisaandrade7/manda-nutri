import { supabase } from './supabaseClient';
import type { Meal, Targets } from './types';

interface MealRow {
  id: string;
  meal_type: Meal['mealType'];
  time: string;
  description: string | null;
  items: Meal['items'];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    mealType: row.meal_type,
    time: row.time,
    description: row.description ?? '',
    items: row.items,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
  };
}

export async function getDayMeals(userId: string, date: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('time', { ascending: true });
  if (error) throw error;
  return (data as MealRow[]).map(rowToMeal);
}

export async function saveMeal(userId: string, date: string, meal: Meal): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .upsert({
      id: meal.id,
      user_id: userId,
      date,
      meal_type: meal.mealType,
      time: meal.time,
      description: meal.description,
      items: meal.items,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToMeal(data as MealRow);
}

export async function deleteMeal(mealId: string): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', mealId);
  if (error) throw error;
}

export async function getTargets(userId: string): Promise<Targets | null> {
  const { data, error } = await supabase
    .from('daily_targets')
    .select('calories, protein, carbs, fat')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Targets | null;
}

export async function saveTargets(userId: string, targets: Targets): Promise<void> {
  const { error } = await supabase
    .from('daily_targets')
    .upsert({ user_id: userId, ...targets });
  if (error) throw error;
}
