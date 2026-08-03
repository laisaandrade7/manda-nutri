import { Trash2, Pencil } from 'lucide-react';
import { COLORS, MEAL_TYPES } from '../lib/constants';
import type { Meal } from '../lib/types';

interface MealTicketProps {
  meal: Meal;
  index: number;
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
}

export function MealTicket({ meal, index, onEdit, onDelete }: MealTicketProps) {
  const mealTypeInfo = MEAL_TYPES.find((m) => m.id === meal.mealType) || MEAL_TYPES[0];
  const Icon = mealTypeInfo.icon;
  const rotate = index % 2 === 0 ? -0.5 : 0.5;
  return (
    <div
      className="rounded-lg mb-3 overflow-hidden"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, transform: `rotate(${rotate}deg)` }}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: COLORS.textMuted }} />
          <span className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.textMuted }}>
            {mealTypeInfo.label}
          </span>
          <span className="text-[11px] font-mono" style={{ color: COLORS.textMuted }}>
            {meal.time}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(meal)} className="p-1.5 active:opacity-60" aria-label="Editar">
            <Pencil size={13} style={{ color: COLORS.textMuted }} />
          </button>
          <button onClick={() => meal.id && onDelete(meal.id)} className="p-1.5 active:opacity-60" aria-label="Excluir">
            <Trash2 size={13} style={{ color: COLORS.textMuted }} />
          </button>
        </div>
      </div>
      <div className="px-3 pt-1 pb-2 text-sm" style={{ color: COLORS.text }}>
        {meal.description || 'Refeição registrada'}
      </div>
      <div className="flex justify-between px-1" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="w-1 h-1 rounded-full" style={{ background: COLORS.bg }} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-px px-3 py-2 font-mono text-[11px]" style={{ color: COLORS.textMuted }}>
        <div>
          <div style={{ color: COLORS.text }}>{Math.round(meal.calories)}</div>kcal
        </div>
        <div>
          <div style={{ color: COLORS.protein }}>{Math.round(meal.protein)}g</div>prot
        </div>
        <div>
          <div style={{ color: COLORS.carbs }}>{Math.round(meal.carbs)}g</div>carb
        </div>
        <div>
          <div style={{ color: COLORS.fat }}>{Math.round(meal.fat)}g</div>gord
        </div>
      </div>
    </div>
  );
}
