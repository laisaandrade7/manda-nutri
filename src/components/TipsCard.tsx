import { COLORS } from '../lib/constants';
import mandaAvatar from '../assets/manda-avatar.webp';

interface TipsCardProps {
  tips: string[];
}

export function TipsCard({ tips }: TipsCardProps) {
  return (
    <div
      className="rounded-lg p-4 pl-5 mb-6 flex gap-3"
      style={{ background: COLORS.surfaceAlt, borderLeft: `3px solid ${COLORS.warn}`, transform: 'rotate(-0.4deg)' }}
    >
      <img
        src={mandaAvatar}
        alt=""
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        style={{ border: `1px solid ${COLORS.border}` }}
      />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: COLORS.textMuted }}>
          Notas da Manda
        </div>
        <ul className="space-y-2">
          {tips.map((t, i) => (
            <li key={i} className="text-sm leading-snug" style={{ color: COLORS.text }}>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
