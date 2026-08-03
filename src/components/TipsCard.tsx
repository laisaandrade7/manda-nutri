import { COLORS } from '../lib/constants';

interface TipsCardProps {
  tips: string[];
}

export function TipsCard({ tips }: TipsCardProps) {
  return (
    <div
      className="rounded-lg p-4 mb-6"
      style={{ background: COLORS.surfaceAlt, borderLeft: `3px solid ${COLORS.warn}`, transform: 'rotate(-0.4deg)' }}
    >
      <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: COLORS.textMuted }}>
        Notas do dia
      </div>
      <ul className="space-y-2">
        {tips.map((t, i) => (
          <li key={i} className="text-sm leading-snug" style={{ color: COLORS.text }}>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
