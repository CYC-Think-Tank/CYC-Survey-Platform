'use client';
import { useId, useMemo } from 'react';
import { motion } from 'motion/react';

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

const WIDTH = 800;
const HEIGHT = 220;
const PAD_LEFT = 36;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

function niceMax(value: number) {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return Math.ceil(value / magnitude) * magnitude;
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x},${p0.y} ${midX},${midY}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last.x},${last.y}`;
  return d;
}

export function ResponseTrendChart({ data }: { data: TrendPoint[] }) {
  const gradientId = useId();

  const { linePath, areaPath, points, gridLines, dateTicks } = useMemo(() => {
    const chartWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const max = niceMax(Math.max(...data.map((d) => d.count), 0));
    const n = Math.max(data.length - 1, 1);

    const pts = data.map((d, i) => ({
      x: PAD_LEFT + (i / n) * chartWidth,
      y: PAD_TOP + chartHeight - (max === 0 ? 0 : (d.count / max) * chartHeight),
      date: d.date,
      count: d.count,
    }));

    const line = buildSmoothPath(pts);
    const area =
      pts.length > 0
        ? `${line} L ${pts[pts.length - 1].x},${PAD_TOP + chartHeight} L ${pts[0].x},${PAD_TOP + chartHeight} Z`
        : '';

    const gridSteps = 4;
    const grid = Array.from({ length: gridSteps + 1 }, (_, i) => {
      const value = Math.round((max / gridSteps) * i);
      const y = PAD_TOP + chartHeight - (i / gridSteps) * chartHeight;
      return { value, y };
    });

    const tickEvery = Math.max(1, Math.ceil(data.length / 6));
    const ticks = pts.filter((_, i) => i % tickEvery === 0 || i === pts.length - 1);

    return { linePath: line, areaPath: area, points: pts, gridLines: grid, dateTicks: ticks };
  }, [data]);

  const formatDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative h-56 w-full">
      {/* The SVG is stretched non-uniformly to fill the card (preserveAspectRatio
          "none"), which is fine for geometry but would distort <text>, so axis
          labels are rendered as a plain HTML overlay instead, positioned by
          percentage to line up with the SVG coordinate space. */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="text-border">
          {gridLines.map((g) => (
            <line
              key={g.value}
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={g.y}
              y2={g.y}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          ))}
        </g>

        <g className="text-ink">
          <motion.path
            d={areaPath}
            fill={`url(#${gradientId})`}
            stroke="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
          <motion.path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
          {points.length > 0 && (
            <motion.circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r={3.5}
              fill="currentColor"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 1 }}
            />
          )}
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0">
        {gridLines.map((g) => (
          <span
            key={g.value}
            className="absolute left-0 -translate-y-1/2 whitespace-nowrap text-[11px] text-ink-soft"
            style={{ top: `${(g.y / HEIGHT) * 100}%` }}
          >
            {g.value}
          </span>
        ))}
        {dateTicks.map((t, i) => (
          <span
            key={t.date}
            className="absolute bottom-0 whitespace-nowrap text-[11px] text-ink-soft"
            style={{
              left: `${(t.x / WIDTH) * 100}%`,
              transform:
                i === 0
                  ? 'translateX(0)'
                  : i === dateTicks.length - 1
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
            }}
          >
            {formatDate(t.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
