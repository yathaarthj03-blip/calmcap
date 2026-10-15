import { monthLabel } from './dates';
import type { RoadmapRow } from './plan';

function cell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function roadmapCsv(
  rows: RoadmapRow[],
  where: (row: RoadmapRow) => string,
  status: (row: RoadmapRow) => string,
): string {
  const head = [
    'Month', 'Saving min', 'Saving max', 'Investing min', 'Investing max',
    'Total min', 'Total max', 'Recommended', 'Where', 'Cumulative target (likely)', 'Status', 'Milestone',
  ];
  const lines = rows.map((r) =>
    [
      monthLabel(r.month), r.saving[0], r.saving[1], r.investing[0], r.investing[1],
      r.total[0], r.total[1], r.recommended, where(r), r.cumulative, status(r),
      r.isQuarterEnd || r.isFinal ? 'Yes' : '',
    ].map(cell).join(','),
  );
  return [head.join(','), ...lines].join('\n');
}
