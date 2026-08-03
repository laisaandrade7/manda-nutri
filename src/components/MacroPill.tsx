import { COLORS } from '../lib/constants';

interface MacroPillProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
}

export function MacroPill({ label, consumed, target, color }: MacroPillProps) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  return (
    <div className="rounded-xl p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <div className="text-[11px] mb-1" style={{ color: COLORS.textMuted }}>
        {label}
      </div>
      <div className="font-mono text-sm mb-2" style={{ color: COLORS.text }}>
        {Math.round(consumed)}
        <span style={{ color: COLORS.textMuted }}>/{target}g</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: COLORS.surfaceAlt }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
