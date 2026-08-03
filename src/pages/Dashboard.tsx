import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { COLORS, MEAL_TYPES } from '../lib/constants';
import { dateKeyFor } from '../lib/types';
import type { Targets } from '../lib/types';
import { getMealsInRange, getLoggedDates, getTargets } from '../lib/mealsApi';
import type { MealWithDate } from '../lib/mealsApi';
import { buildDashboardStats } from '../lib/analytics';
import type { DashboardStats } from '../lib/analytics';
import { CalorieLineChart } from '../components/CalorieLineChart';
import { MacroDonut } from '../components/MacroDonut';

interface DashboardProps {
  userId: string;
  onBack: () => void;
}

const RANGE_OPTIONS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

const DEFAULT_TARGETS: Targets = { calories: 2000, protein: 150, carbs: 200, fat: 65 };
const STREAK_LOOKBACK_DAYS = 120;

function startDateFor(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return dateKeyFor(d);
}

function formatWeekdayHeight(avg: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max((avg / max) * 100, avg > 0 ? 6 : 0);
}

export function Dashboard({ userId, onBack }: DashboardProps) {
  const [rangeDays, setRangeDays] = useState(30);
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [meals, setMeals] = useState<MealWithDate[]>([]);
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [t, m, dates] = await Promise.all([
          getTargets(userId),
          getMealsInRange(userId, startDateFor(rangeDays), dateKeyFor(new Date())),
          getLoggedDates(userId, startDateFor(STREAK_LOOKBACK_DAYS)),
        ]);
        if (cancelled) return;
        if (t) setTargets(t);
        setMeals(m);
        setLoggedDates(dates);
      } catch {
        if (!cancelled) setLoadError(true);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, rangeDays]);

  const stats: DashboardStats = useMemo(
    () => buildDashboardStats(meals, loggedDates, targets),
    [meals, loggedDates, targets]
  );

  const maxWeekdayAvg = Math.max(...stats.weekdayPattern.map((w) => w.avgCalories), 1);

  function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-3xl px-4 pt-6 pb-16 flex flex-col gap-5">
        <header className="flex justify-between items-end gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full active:opacity-60 active:scale-95 transition cursor-pointer flex-shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} style={{ color: COLORS.textMuted }} />
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>
                Painel de análises
              </h1>
              <p className="text-xs" style={{ color: COLORS.textMuted }}>
                Seus padrões alimentares dos últimos {rangeDays} dias
              </p>
            </div>
          </div>
          <div
            className="inline-flex rounded-full p-0.5 gap-0.5"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            role="tablist"
            aria-label="Período"
          >
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                role="tab"
                aria-selected={rangeDays === opt.days}
                onClick={() => setRangeDays(opt.days)}
                className="px-3.5 py-1.5 rounded-full text-xs cursor-pointer transition"
                style={{
                  background: rangeDays === opt.days ? COLORS.surfaceAlt : 'transparent',
                  color: rangeDays === opt.days ? COLORS.text : COLORS.textMuted,
                  fontWeight: rangeDays === opt.days ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        {loading && (
          <div className="text-sm py-16 text-center" style={{ color: COLORS.textMuted }}>
            Carregando...
          </div>
        )}

        {!loading && loadError && (
          <div className="text-sm py-16 text-center" style={{ color: COLORS.over }}>
            Não foi possível carregar os dados. Tente novamente.
          </div>
        )}

        {!loading && !loadError && stats.days.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: COLORS.surface, border: `1px dashed ${COLORS.border}` }}
          >
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Ainda não há refeições registradas nesse período. Volte aqui depois de registrar alguns dias.
            </p>
          </div>
        )}

        {!loading && !loadError && stats.days.length > 0 && (
          <>
            {/* Hero stats */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="rounded-2xl p-4.5 flex flex-col gap-1.5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: '18px 20px' }}>
                <span className="text-sm" style={{ color: COLORS.textMuted }}>
                  Aderência à meta
                </span>
                <span className="text-3xl font-bold font-mono" style={{ color: COLORS.text }}>
                  {stats.adherencePct}%
                </span>
                <span className="text-xs" style={{ color: COLORS.textMuted }}>
                  Dias com calorias entre 80% e 110% da meta
                </span>
              </div>
              <div className="rounded-2xl flex flex-col gap-1.5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: '18px 20px' }}>
                <span className="text-sm" style={{ color: COLORS.textMuted }}>
                  Streak atual
                </span>
                <span className="text-3xl font-bold font-mono" style={{ color: COLORS.text }}>
                  {stats.streak} {stats.streak === 1 ? 'dia' : 'dias'}
                </span>
                <span className="text-xs" style={{ color: COLORS.textMuted }}>
                  Dias seguidos com refeições registradas
                </span>
              </div>
              <div className="rounded-2xl flex flex-col gap-1.5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: '18px 20px' }}>
                <span className="text-sm" style={{ color: COLORS.textMuted }}>
                  Média diária
                </span>
                <span className="text-3xl font-bold font-mono" style={{ color: COLORS.text }}>
                  {Math.round(stats.averages.calories)} kcal
                </span>
                <span className="text-xs" style={{ color: COLORS.textMuted }}>
                  Meta: {targets.calories} kcal
                </span>
              </div>
            </section>

            {/* Line chart + macro donut */}
            <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3.5 items-stretch">
              <div className="rounded-2xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: '18px 20px' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COLORS.textMuted }}>
                  Calorias diárias vs. meta
                </h2>
                <CalorieLineChart days={stats.days} targetCalories={targets.calories} />
              </div>
              <div className="rounded-2xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: '18px 20px' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COLORS.textMuted }}>
                  Macros: real vs. meta
                </h2>
                <MacroDonut averages={stats.averages} targets={targets} />
              </div>
            </section>

            {/* Meal type distribution */}
            <section className="rounded-2xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: '18px 20px' }}>
              <h2 className="text-xs font-semibold uppercase tracking-wide mb-3.5" style={{ color: COLORS.textMuted }}>
                Distribuição calórica por refeição
              </h2>
              <div className="flex flex-col gap-3">
                {stats.mealTypeDistribution.map((share) => {
                  const meta = MEAL_TYPES.find((mt) => mt.id === share.mealType)!;
                  const barColor =
                    share.mealType === 'cafe'
                      ? COLORS.fat
                      : share.mealType === 'almoco'
                        ? COLORS.protein
                        : share.mealType === 'lanche'
                          ? COLORS.carbs
                          : COLORS.over;
                  return (
                    <div key={share.mealType} className="grid gap-3 items-center" style={{ gridTemplateColumns: '110px 1fr 56px' }}>
                      <span className="text-sm font-semibold flex items-center gap-2" style={{ color: COLORS.text }}>
                        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: barColor }} />
                        {meta.label}
                      </span>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: COLORS.surfaceAlt }}>
                        <div className="h-full rounded-full" style={{ width: `${share.pct}%`, background: barColor }} />
                      </div>
                      <span className="text-sm font-mono text-right" style={{ color: COLORS.textMuted }}>
                        {Math.round(share.pct)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Extremes + weekday pattern */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="rounded-2xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: '18px 20px' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-3.5" style={{ color: COLORS.textMuted }}>
                  Extremos do período
                </h2>
                <div className="flex flex-col gap-3">
                  {stats.extremes.highestDay && (
                    <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <div>
                        <div className="text-sm" style={{ color: COLORS.textMuted }}>
                          Dia mais calórico
                        </div>
                        <div className="text-xs capitalize" style={{ color: COLORS.textMuted }}>
                          {formatDate(stats.extremes.highestDay.date)}
                        </div>
                      </div>
                      <div className="text-base font-bold font-mono" style={{ color: COLORS.over }}>
                        {Math.round(stats.extremes.highestDay.calories)} kcal
                      </div>
                    </div>
                  )}
                  {stats.extremes.lowestDay && (
                    <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <div>
                        <div className="text-sm" style={{ color: COLORS.textMuted }}>
                          Dia menos calórico
                        </div>
                        <div className="text-xs capitalize" style={{ color: COLORS.textMuted }}>
                          {formatDate(stats.extremes.lowestDay.date)}
                        </div>
                      </div>
                      <div className="text-base font-bold font-mono" style={{ color: COLORS.good }}>
                        {Math.round(stats.extremes.lowestDay.calories)} kcal
                      </div>
                    </div>
                  )}
                  {stats.extremes.highestMeal && (
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm" style={{ color: COLORS.textMuted }}>
                          Refeição mais calórica
                        </div>
                        <div className="text-xs capitalize" style={{ color: COLORS.textMuted }}>
                          {MEAL_TYPES.find((mt) => mt.id === stats.extremes.highestMeal!.mealType)?.label} ·{' '}
                          {formatDate(stats.extremes.highestMeal.date)}
                        </div>
                      </div>
                      <div className="text-base font-bold font-mono" style={{ color: COLORS.text }}>
                        {Math.round(stats.extremes.highestMeal.calories)} kcal
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: '18px 20px' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-3.5" style={{ color: COLORS.textMuted }}>
                  Padrão por dia da semana
                </h2>
                <div
                  className="flex items-end gap-2"
                  style={{ height: 100 }}
                  role="img"
                  aria-label="Média de calorias por dia da semana"
                >
                  {stats.weekdayPattern.map((w) => (
                    <div key={w.weekday} className="flex-1 flex flex-col items-center gap-1.5 justify-end h-full">
                      <div
                        className="w-full rounded-t"
                        style={{
                          maxWidth: 28,
                          height: `${formatWeekdayHeight(w.avgCalories, maxWeekdayAvg)}%`,
                          background: w.avgCalories > targets.calories ? COLORS.over : COLORS.carbs,
                          borderRadius: '4px 4px 2px 2px',
                        }}
                        title={`${w.label}: ${Math.round(w.avgCalories)} kcal em média`}
                      />
                      <span className="text-[0.6875rem] uppercase" style={{ color: COLORS.textMuted }}>
                        {w.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
