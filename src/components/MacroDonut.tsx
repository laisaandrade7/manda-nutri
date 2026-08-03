import { COLORS } from '../lib/constants';
import type { DayTotal } from '../lib/analytics';
import type { Targets } from '../lib/types';

interface MacroDonutProps {
  averages: DayTotal;
  targets: Targets;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MacroDonut({ averages, targets }: MacroDonutProps) {
  const proteinKcal = averages.protein * 4;
  const carbsKcal = averages.carbs * 4;
  const fatKcal = averages.fat * 9;
  const totalKcal = proteinKcal + carbsKcal + fatKcal;

  const proteinFrac = totalKcal > 0 ? proteinKcal / totalKcal : 0;
  const carbsFrac = totalKcal > 0 ? carbsKcal / totalKcal : 0;
  const fatFrac = totalKcal > 0 ? fatKcal / totalKcal : 0;

  const proteinDash = proteinFrac * CIRCUMFERENCE;
  const carbsDash = carbsFrac * CIRCUMFERENCE;
  const fatDash = fatFrac * CIRCUMFERENCE;

  const macros = [
    { label: 'Proteína', color: COLORS.protein, consumed: averages.protein, target: targets.protein },
    { label: 'Carboidrato', color: COLORS.carbs, consumed: averages.carbs, target: targets.carbs },
    { label: 'Gordura', color: COLORS.fat, consumed: averages.fat, target: targets.fat },
  ];

  const furthestOff = macros.reduce((worst, m) => {
    if (m.target <= 0) return worst;
    const diffPct = (m.consumed / m.target - 1) * 100;
    return Math.abs(diffPct) > Math.abs(worst.diffPct) ? { ...m, diffPct } : worst;
  }, { label: '', diffPct: 0 });

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          role="img"
          aria-label="Gráfico de rosca mostrando a distribuição média diária de proteína, carboidrato e gordura em calorias"
        >
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke={COLORS.surfaceAlt} strokeWidth="14" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={COLORS.protein}
            strokeWidth="14"
            strokeDasharray={`${proteinDash} ${CIRCUMFERENCE - proteinDash}`}
            strokeDashoffset={0}
            transform="rotate(-90 60 60)"
            strokeLinecap={proteinFrac < 0.999 && proteinFrac > 0 ? 'round' : 'butt'}
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={COLORS.carbs}
            strokeWidth="14"
            strokeDasharray={`${carbsDash} ${CIRCUMFERENCE - carbsDash}`}
            strokeDashoffset={-proteinDash}
            transform="rotate(-90 60 60)"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={COLORS.fat}
            strokeWidth="14"
            strokeDasharray={`${fatDash} ${CIRCUMFERENCE - fatDash}`}
            strokeDashoffset={-(proteinDash + carbsDash)}
            transform="rotate(-90 60 60)"
            strokeLinecap={fatFrac < 0.999 && fatFrac > 0 ? 'round' : 'butt'}
          />
          <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill={COLORS.text} fontFamily="monospace">
            {Math.round(averages.calories)}
          </text>
          <text x="60" y="72" textAnchor="middle" fontSize="9" fill={COLORS.textMuted}>
            kcal/dia
          </text>
        </svg>
        <div className="flex-1 flex flex-col gap-2.5">
          {macros.map((m) => (
            <div key={m.label} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: m.color }} />
              <span className="flex-1 font-medium" style={{ color: COLORS.text }}>
                {m.label}
              </span>
              <span className="font-mono text-xs" style={{ color: COLORS.textMuted }}>
                {Math.round(m.consumed)}g / {m.target}g
              </span>
            </div>
          ))}
        </div>
      </div>
      {furthestOff.label && (
        <p className="text-xs pt-2.5" style={{ color: COLORS.textMuted, borderTop: `1px solid ${COLORS.border}` }}>
          {furthestOff.label} {furthestOff.diffPct > 0 ? 'acima' : 'abaixo'} da meta em média (
          {Math.abs(Math.round(furthestOff.diffPct))}%).
        </p>
      )}
    </div>
  );
}
