import { useState } from 'react';
import { X, LogOut } from 'lucide-react';
import { COLORS } from '../lib/constants';
import { supabase } from '../lib/supabaseClient';
import type { Targets } from '../lib/types';

interface SettingsModalProps {
  targets: Targets;
  onClose: () => void;
  onSave: (targets: Targets) => void;
}

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
};

export function SettingsModal({ targets, onClose, onSave }: SettingsModalProps) {
  const [calories, setCalories] = useState(targets.calories);
  const [protein, setProtein] = useState(targets.protein);
  const [carbs, setCarbs] = useState(targets.carbs);
  const [fat, setFat] = useState(targets.fat);
  const [showCalc, setShowCalc] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'F' | 'M'>('F');
  const [activity, setActivity] = useState('moderado');
  const [goal, setGoal] = useState<'deficit' | 'manutencao' | 'superavit'>('deficit');

  function applyCalculator() {
    const w = Number(weight);
    const h = Number(height);
    const a = Number(age);
    if (!w || !h || !a) return;
    const bmr = sex === 'M' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    const tdee = bmr * (ACTIVITY_FACTORS[activity] || 1.375);
    let cals = tdee;
    if (goal === 'deficit') cals = tdee - 350;
    if (goal === 'superavit') cals = tdee + 250;
    const prot = w * 2.0;
    const fatG = (cals * 0.25) / 9;
    const carbG = Math.max(0, (cals - prot * 4 - fatG * 9) / 4);
    setCalories(Math.round(cals));
    setProtein(Math.round(prot));
    setFat(Math.round(fatG));
    setCarbs(Math.round(carbG));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function handleSave() {
    onSave({
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-t-2xl max-h-[90vh] overflow-y-auto" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
        <div
          className="sticky top-0 flex items-center justify-between px-4 py-3"
          style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
            Metas diárias
          </span>
          <button onClick={onClose} className="p-1.5 active:opacity-60">
            <X size={18} style={{ color: COLORS.textMuted }} />
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs" style={{ color: COLORS.textMuted }}>
                Calorias (kcal)
              </label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="w-full font-mono text-sm px-2 py-2 rounded mt-1"
                style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: COLORS.protein }}>
                Proteína (g)
              </label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(Number(e.target.value))}
                className="w-full font-mono text-sm px-2 py-2 rounded mt-1"
                style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: COLORS.carbs }}>
                Carboidrato (g)
              </label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(Number(e.target.value))}
                className="w-full font-mono text-sm px-2 py-2 rounded mt-1"
                style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: COLORS.fat }}>
                Gordura (g)
              </label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(Number(e.target.value))}
                className="w-full font-mono text-sm px-2 py-2 rounded mt-1"
                style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              />
            </div>
          </div>

          <button onClick={() => setShowCalc(!showCalc)} className="text-xs underline mb-3" style={{ color: COLORS.textMuted }}>
            {showCalc ? 'Ocultar calculadora' : 'Calcular sugestão a partir dos meus dados'}
          </button>

          {showCalc && (
            <div className="rounded-lg p-3 mb-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="number"
                  placeholder="Peso (kg)"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                />
                <input
                  type="number"
                  placeholder="Altura (cm)"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                />
                <input
                  type="number"
                  placeholder="Idade"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as 'F' | 'M')}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                >
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </select>
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                >
                  <option value="sedentario">Sedentário</option>
                  <option value="leve">Leve (1-3x/sem)</option>
                  <option value="moderado">Moderado (3-5x/sem)</option>
                  <option value="intenso">Intenso (6-7x/sem)</option>
                </select>
              </div>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as 'deficit' | 'manutencao' | 'superavit')}
                className="w-full text-sm px-2 py-1.5 rounded mb-3"
                style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              >
                <option value="deficit">Déficit leve (recomposição / emagrecimento)</option>
                <option value="manutencao">Manutenção</option>
                <option value="superavit">Superávit leve (foco em massa)</option>
              </select>
              <button
                onClick={applyCalculator}
                className="w-full py-2 rounded-lg text-sm font-medium"
                style={{ background: COLORS.protein, color: COLORS.bg }}
              >
                Aplicar sugestão
              </button>
              <p className="text-[11px] mt-2 leading-snug" style={{ color: COLORS.textMuted }}>
                Estimativa geral (fórmula Mifflin-St Jeor + 2g de proteína/kg). Ajuste com base na sua resposta ao longo das semanas, ou com orientação profissional.
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full py-3 rounded-lg text-sm font-medium mb-3"
            style={{ background: COLORS.protein, color: COLORS.bg }}
          >
            Salvar metas
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium mb-6"
            style={{ background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}
          >
            <LogOut size={16} />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
