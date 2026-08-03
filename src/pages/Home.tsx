import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Settings, Plus } from 'lucide-react';
import { COLORS } from '../lib/constants';
import { dateKeyFor, formatDisplayDate } from '../lib/types';
import type { Meal, Targets } from '../lib/types';
import { generateTips } from '../lib/tips';
import { getDayMeals, saveMeal, deleteMeal, getTargets, saveTargets } from '../lib/mealsApi';
import { GaugeBar } from '../components/GaugeBar';
import { MacroPill } from '../components/MacroPill';
import { MealTicket } from '../components/MealTicket';
import { TipsCard } from '../components/TipsCard';
import { AddMealModal } from '../components/AddMealModal';
import { SettingsModal } from '../components/SettingsModal';

const DEFAULT_TARGETS: Targets = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

interface HomeProps {
  userId: string;
}

export function Home({ userId }: HomeProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [loadingDay, setLoadingDay] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [storageError, setStorageError] = useState(false);

  const dateKey = useMemo(() => dateKeyFor(currentDate), [currentDate]);
  const isToday = dateKey === dateKeyFor(new Date());

  useEffect(() => {
    (async () => {
      try {
        const t = await getTargets(userId);
        if (t) setTargets(t);
      } catch {
        // sem metas salvas ainda — mantém padrão
      }
    })();
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDay(true);
      try {
        const dayMeals = await getDayMeals(userId, dateKey);
        if (!cancelled) setMeals(dayMeals);
      } catch {
        if (!cancelled) setMeals([]);
      }
      if (!cancelled) setLoadingDay(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, dateKey]);

  async function handleSaveMeal(meal: Meal) {
    try {
      const saved = await saveMeal(userId, dateKey, meal);
      setMeals((prev) => {
        const idx = prev.findIndex((m) => m.id === saved.id);
        const next = idx >= 0 ? prev.map((m, i) => (i === idx ? saved : m)) : [...prev, saved];
        return next.sort((a, b) => a.time.localeCompare(b.time));
      });
    } catch {
      setStorageError(true);
    }
    setShowAddModal(false);
    setEditingMeal(null);
  }

  async function handleDeleteMeal(id: string) {
    try {
      await deleteMeal(id);
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setStorageError(true);
    }
    setShowAddModal(false);
    setEditingMeal(null);
  }

  async function handleSaveTargets(newTargets: Targets) {
    setTargets(newTargets);
    try {
      await saveTargets(userId, newTargets);
    } catch {
      setStorageError(true);
    }
    setShowSettings(false);
  }

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        protein: acc.protein + (Number(m.protein) || 0),
        carbs: acc.carbs + (Number(m.carbs) || 0),
        fat: acc.fat + (Number(m.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  const tips = useMemo(() => generateTips(totals, targets), [totals, targets]);

  function goPrevDay() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }
  function goNextDay() {
    if (isToday) return;
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-md px-4 pt-6 pb-28">
        <div className="flex items-center justify-between mb-6">
          <button onClick={goPrevDay} className="p-2 rounded-full active:opacity-60" aria-label="Dia anterior">
            <ChevronLeft size={20} style={{ color: COLORS.textMuted }} />
          </button>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.textMuted }}>
              Registro diário
            </div>
            <div className="text-lg font-semibold capitalize" style={{ color: COLORS.text }}>
              {formatDisplayDate(currentDate)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goNextDay}
              className="p-2 rounded-full active:opacity-60"
              style={{ opacity: isToday ? 0.3 : 1 }}
              aria-label="Próximo dia"
            >
              <ChevronRight size={20} style={{ color: COLORS.textMuted }} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full active:opacity-60" aria-label="Configurações">
              <Settings size={20} style={{ color: COLORS.textMuted }} />
            </button>
          </div>
        </div>

        <GaugeBar consumed={totals.calories} target={targets.calories} />

        <div className="grid grid-cols-3 gap-2 mb-6">
          <MacroPill label="Proteína" consumed={totals.protein} target={targets.protein} color={COLORS.protein} />
          <MacroPill label="Carboidrato" consumed={totals.carbs} target={targets.carbs} color={COLORS.carbs} />
          <MacroPill label="Gordura" consumed={totals.fat} target={targets.fat} color={COLORS.fat} />
        </div>

        {!loadingDay && meals.length > 0 && <TipsCard tips={tips} />}

        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: COLORS.textMuted }}>
          Refeições {isToday ? 'de hoje' : 'do dia'}
        </div>

        {loadingDay && (
          <div className="text-sm py-8 text-center" style={{ color: COLORS.textMuted }}>
            Carregando...
          </div>
        )}

        {!loadingDay && meals.length === 0 && (
          <div className="rounded-lg p-6 text-center mb-4" style={{ background: COLORS.surface, border: `1px dashed ${COLORS.border}` }}>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Nenhuma refeição registrada {isToday ? 'ainda hoje' : 'neste dia'}.
            </p>
          </div>
        )}

        {!loadingDay &&
          meals.map((meal, i) => (
            <MealTicket
              key={meal.id}
              meal={meal}
              index={i}
              onEdit={(m) => {
                setEditingMeal(m);
                setShowAddModal(true);
              }}
              onDelete={handleDeleteMeal}
            />
          ))}

        {storageError && (
          <p className="text-xs text-center mt-2" style={{ color: COLORS.over }}>
            Alguns dados podem não ter sido salvos. Tente novamente.
          </p>
        )}
      </div>

      {isToday && (
        <button
          onClick={() => {
            setEditingMeal(null);
            setShowAddModal(true);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: COLORS.protein }}
          aria-label="Adicionar refeição"
        >
          <Plus size={26} style={{ color: COLORS.bg }} />
        </button>
      )}

      {showAddModal && (
        <AddMealModal
          initialMeal={editingMeal}
          onClose={() => {
            setShowAddModal(false);
            setEditingMeal(null);
          }}
          onSave={handleSaveMeal}
          onDelete={handleDeleteMeal}
        />
      )}

      {showSettings && <SettingsModal targets={targets} onClose={() => setShowSettings(false)} onSave={handleSaveTargets} />}
    </div>
  );
}
