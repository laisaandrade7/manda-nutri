import { COLORS } from '../lib/constants';

interface GaugeBarProps {
  consumed: number;
  target: number;
}

export function GaugeBar({ consumed, target }: GaugeBarProps) {
  const pct = target > 0 ? (consumed / target) * 100 : 0;
  const clamped = Math.min(pct, 100);
  const over = consumed > target;
  const remaining = target - consumed;
  const barColor = pct > 110 ? COLORS.over : pct > 100 ? COLORS.warn : COLORS.good;
  return (
    <div className="mb-6">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="font-mono text-3xl font-semibold" style={{ color: COLORS.text }}>
            {Math.abs(Math.round(remaining))}
          </div>
          <div className="text-xs" style={{ color: COLORS.textMuted }}>
            {over ? 'kcal acima da meta' : 'kcal restantes hoje'}
          </div>
        </div>
        <div className="text-right font-mono text-sm" style={{ color: COLORS.textMuted }}>
          {Math.round(consumed)} / {target} kcal
        </div>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: COLORS.surfaceAlt }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, background: barColor }} />
        {[25, 50, 75].map((t) => (
          <div key={t} className="absolute top-0 bottom-0 w-px" style={{ left: `${t}%`, background: COLORS.bg, opacity: 0.5 }} />
        ))}
      </div>
    </div>
  );
}
