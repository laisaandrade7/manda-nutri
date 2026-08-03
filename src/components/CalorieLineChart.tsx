import { useRef, useState } from 'react';
import { COLORS } from '../lib/constants';
import type { DayTotal } from '../lib/analytics';

interface CalorieLineChartProps {
  days: DayTotal[];
  targetCalories: number;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 20;

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function CalorieLineChart({ days, targetCalories }: CalorieLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (days.length === 0) {
    return (
      <p className="text-sm py-10 text-center" style={{ color: COLORS.textMuted }}>
        Sem refeições registradas nesse período ainda.
      </p>
    );
  }

  const maxValue = Math.max(targetCalories, ...days.map((d) => d.calories)) * 1.1;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  function xFor(index: number) {
    return days.length > 1 ? (index / (days.length - 1)) * WIDTH : WIDTH / 2;
  }
  function yFor(value: number) {
    return PADDING_TOP + plotHeight - (value / maxValue) * plotHeight;
  }

  const points = days.map((d, i) => ({ x: xFor(i), y: yFor(d.calories), day: d }));
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points.map((p) => `${p.x},${p.y}`).join(' ')} ${WIDTH},${HEIGHT} 0,${HEIGHT}`;
  const goalY = yFor(targetCalories);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltipLeftPct = hovered ? (hovered.x / WIDTH) * 100 : 0;
  const flipTooltip = tooltipLeftPct > 65;

  return (
    <div className="relative">
      <div className="flex justify-between text-[0.75rem] mb-1" style={{ color: COLORS.textMuted }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.fat }} />
          Consumido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.textMuted }} />
          Meta ({Math.round(targetCalories)})
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`Gráfico de linha mostrando calorias diárias comparadas à meta de ${targetCalories} kcal, ao longo de ${days.length} dias`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        style={{ overflow: 'visible', cursor: 'crosshair' }}
      >
        {[0.1, 0.4, 0.7, 1].map((frac) => (
          <line
            key={frac}
            x1={0}
            y1={PADDING_TOP + plotHeight * (1 - frac)}
            x2={WIDTH}
            y2={PADDING_TOP + plotHeight * (1 - frac)}
            stroke={COLORS.border}
            strokeWidth={1}
          />
        ))}

        <line x1={0} y1={goalY} x2={WIDTH} y2={goalY} stroke={COLORS.textMuted} strokeWidth={1.5} strokeDasharray="4 4" />

        <polygon points={areaPoints} fill={COLORS.fat} opacity={0.12} />
        <polyline points={linePoints} fill="none" stroke={COLORS.fat} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <circle
            key={p.day.date}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 || i === hoverIndex ? 4.5 : 0}
            fill={COLORS.bg}
            stroke={COLORS.fat}
            strokeWidth={2.5}
          />
        ))}

        {hovered && (
          <line x1={hovered.x} y1={10} x2={hovered.x} y2={HEIGHT - 10} stroke={COLORS.text} strokeWidth={1} strokeDasharray="3 3" opacity={0.35} />
        )}
      </svg>

      {hovered && (
        <div
          className="absolute pointer-events-none rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-nowrap"
          style={{
            background: COLORS.surfaceAlt,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
            left: `${tooltipLeftPct}%`,
            transform: flipTooltip ? 'translateX(-100%)' : 'translateX(0)',
            top: 8,
          }}
        >
          <div className="font-semibold mb-0.5" style={{ color: COLORS.textMuted }}>
            {formatShortDate(hovered.day.date)}
          </div>
          <div className="flex justify-between gap-3">
            <span>Consumido</span>
            <span className="font-mono font-semibold" style={{ color: COLORS.fat }}>
              {Math.round(hovered.day.calories)} kcal
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Meta</span>
            <span className="font-mono font-semibold" style={{ color: COLORS.textMuted }}>
              {Math.round(targetCalories)} kcal
            </span>
          </div>
        </div>
      )}

      <details className="mt-2">
        <summary className="text-xs underline cursor-pointer" style={{ color: COLORS.textMuted, textUnderlineOffset: 2 }}>
          Ver como tabela
        </summary>
        <table className="w-full text-xs mt-2 border-collapse">
          <thead>
            <tr>
              <th className="text-left py-1 px-2 font-semibold" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}>
                Data
              </th>
              <th className="text-left py-1 px-2 font-semibold" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}>
                Consumido
              </th>
              <th className="text-left py-1 px-2 font-semibold" style={{ color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.border}` }}>
                Meta
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td className="py-1 px-2 font-mono" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {formatShortDate(d.date)}
                </td>
                <td className="py-1 px-2 font-mono" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {Math.round(d.calories)} kcal
                </td>
                <td className="py-1 px-2 font-mono" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {Math.round(targetCalories)} kcal
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
