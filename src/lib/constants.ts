import { Coffee, Sun, Moon, Cookie } from 'lucide-react';
import type { MealType } from './types';

export const COLORS = {
  bg: '#1C1A17',
  surface: '#242019',
  surfaceAlt: '#2C2721',
  border: '#3A342B',
  text: '#F3EDE1',
  textMuted: '#A99D89',
  protein: '#C9772B',
  carbs: '#8FA05C',
  fat: '#D4A93A',
  good: '#8FA05C',
  warn: '#D4A93A',
  over: '#BD5A34',
};

export const MEAL_TYPES: Array<{ id: MealType; label: string; icon: typeof Coffee }> = [
  { id: 'cafe', label: 'Café da manhã', icon: Coffee },
  { id: 'almoco', label: 'Almoço', icon: Sun },
  { id: 'lanche', label: 'Lanche', icon: Cookie },
  { id: 'jantar', label: 'Jantar', icon: Moon },
];
