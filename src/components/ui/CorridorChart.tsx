import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CorridorPoint } from '../../engine/plan';
import { inr, inrCompact } from '../../engine/format';
import { monthLabel } from '../../engine/dates';

interface CorridorChartProps {
  data: CorridorPoint[];
  goalAmount?: number;
  height?: number;
  showActual?: boolean;
  hideSummaryFooter?: boolean;
}

export const CorridorChart: React.FC<CorridorChartProps> = ({
  data,
  goalAmount,
  height = 260,
  showActual = false,
  hideSummaryFooter = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center rounded-panel border border-line bg-surface/50 text-sm text-muted"
      >
        No chart data available
      </div>
    );
  }

  // Pre-process data for Recharts:
  // Base band = low
  // Band height = high - low (stacked Area on top of low)
  const chartData = data.map((d) => ({
    ...d,
    lowBase: d.low,
    bandSpread: Math.max(0, d.high - d.low),
    formattedMonth: monthLabel(d.month),
  }));

  const lastPoint = data[data.length - 1];

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="corridorShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.2} />
              <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {/* Faint horizontal grid only */}
          <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" opacity={0.6} />

          <XAxis
            dataKey="formattedMonth"
            stroke="rgb(var(--muted))"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgb(var(--line))' }}
            minTickGap={40}
          />

          <YAxis
            stroke="rgb(var(--muted))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val: number) => inrCompact(val)}
            domain={[0, 'auto']}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const p = payload[0].payload as CorridorPoint & { formattedMonth: string };
              return (
                <div className="rounded-ctl border border-line bg-surface p-3 shadow-md text-xs space-y-1">
                  <div className="font-semibold text-ink">{p.formattedMonth}</div>
                  <div className="flex justify-between gap-4 text-accent font-medium">
                    <span>Likely path:</span>
                    <span className="num font-semibold">{inr(p.likely)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-muted">
                    <span>Range (low - high):</span>
                    <span className="num">{inrCompact(p.low)} – {inrCompact(p.high)}</span>
                  </div>
                  {showActual && p.actual !== undefined && (
                    <div className="flex justify-between gap-4 text-ink font-semibold pt-1 border-t border-line/60">
                      <span>Actual savings:</span>
                      <span className="num">{inr(p.actual)}</span>
                    </div>
                  )}
                  {goalAmount && (
                    <div className="text-muted/80 text-[10px] pt-0.5">
                      Target goal: {inrCompact(goalAmount)}
                    </div>
                  )}
                </div>
              );
            }}
          />

          {/* Goal reference line */}
          {goalAmount && (
            <ReferenceLine
              y={goalAmount}
              stroke="rgb(var(--muted))"
              strokeDasharray="4 4"
              label={{
                value: `Goal: ${inrCompact(goalAmount)}`,
                position: 'top',
                fill: 'rgb(var(--muted))',
                fontSize: 10,
              }}
            />
          )}

          {/* Corridor Range (stacked transparent base + shaded spread) */}
          <Area
            type="monotone"
            dataKey="lowBase"
            stackId="corridor"
            stroke="none"
            fill="transparent"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="bandSpread"
            stackId="corridor"
            stroke="none"
            fill="url(#corridorShade)"
            isAnimationActive={false}
          />

          {/* Likely line in accent (thin 2px line) */}
          <Line
            type="monotone"
            dataKey="likely"
            stroke="rgb(var(--accent))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'rgb(var(--accent))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
            isAnimationActive={false}
          />

          {/* Actual progress line if enabled */}
          {showActual && (
            <Line
              type="monotone"
              dataKey="actual"
              stroke="rgb(var(--ink))"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'rgb(var(--ink))' }}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {!hideSummaryFooter && lastPoint && (
        <div className="flex flex-wrap items-center justify-end text-[11px] text-muted gap-3 sm:gap-4 mt-2 mb-1 px-2">
          <span>Low: <strong className="num text-ink font-semibold">{inrCompact(lastPoint.low)}</strong></span>
          <span>Likely: <strong className="num text-accent font-semibold">{inrCompact(lastPoint.likely)}</strong></span>
          <span>High: <strong className="num text-ink font-semibold">{inrCompact(lastPoint.high)}</strong></span>
        </div>
      )}
    </div>
  );
};
