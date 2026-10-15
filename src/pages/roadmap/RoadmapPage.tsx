import React, { useState, useMemo } from 'react';
import { Download, Target, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  selectActivePlan,
  selectPlanSpec,
  selectRoadmapRows,
  selectSavingsBreakdown,
} from '../../store/selectors';
import { monthKey, monthLabel } from '../../engine/dates';
import { inr, inrCompact } from '../../engine/format';
import { planRange, rowStatus, type RoadmapRow } from '../../engine/plan';
import { corridorSeries } from '../../engine/plan';
import { roadmapCsv } from '../../engine/csv';
import { liveMarketProvider } from '../../data/providers';
import { CorridorChart } from '../../components/ui/CorridorChart';

export const RoadmapPage: React.FC = () => {
  const activePlan = useStore(selectActivePlan);
  const spec = useStore(selectPlanSpec);
  const rows = useStore(selectRoadmapRows);
  const ledger = useStore((s) => s.ledger);
  const savings = useStore(selectSavingsBreakdown);
  const showToast = useStore((s) => s.showToast);

  const [filterMode, setFilterMode] = useState<'12_MONTHS' | 'ALL'>('12_MONTHS');
  const [page, setPage] = useState(1);
  const rowsPerPage = 24;

  const currentMonth = monthKey(new Date());

  // Aggregate monthly logged savings from ledger
  const loggedMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of ledger) {
      map[e.month] = (map[e.month] ?? 0) + e.amount;
    }
    return map;
  }, [ledger]);

  // Overall plan ranges
  const range = useMemo(() => planRange(spec), [spec]);

  const safeShare = spec.allocation.safe / 100;
  const investShare = (spec.allocation.mid + spec.allocation.long) / 100;

  const savingRange = [Math.round(range.min * safeShare), Math.round(range.max * safeShare)];
  const investRange = [Math.round(range.min * investShare), Math.round(range.max * investShare)];

  // Corridor chart points with actual progress
  const chartPoints = useMemo(() => {
    const pts = corridorSeries(spec, activePlan.goal.startMonth);
    return pts.map((p) => {
      // If month has passed or is current, attach actual cumulative savings if available
      return {
        ...p,
        actual: p.month <= currentMonth ? savings.total : undefined,
      };
    });
  }, [spec, activePlan.goal.startMonth, currentMonth, savings.total]);

  // Filtered rows
  const displayRows = useMemo(() => {
    if (filterMode === '12_MONTHS') {
      const startIdx = rows.findIndex((r) => r.month >= currentMonth);
      const safeStart = startIdx >= 0 ? startIdx : 0;
      return rows.slice(safeStart, safeStart + 12);
    }
    return rows;
  }, [rows, filterMode, currentMonth]);

  // Pagination for "ALL"
  const totalPages = Math.ceil(displayRows.length / rowsPerPage);
  const paginatedRows = useMemo(() => {
    if (filterMode === '12_MONTHS') return displayRows;
    const start = (page - 1) * rowsPerPage;
    return displayRows.slice(start, start + rowsPerPage);
  }, [displayRows, filterMode, page]);

  // Where to put it (today's market snapshot)
  const marketSnapshot = useMemo(() => liveMarketProvider.getSnapshot(new Date()), []);
  const safeItems = marketSnapshot.items.filter((i) => i.bucket === 'safe').slice(0, 2);
  const midItems = marketSnapshot.items.filter((i) => i.bucket === 'mid').slice(0, 2);
  const longItems = marketSnapshot.items.filter((i) => i.bucket === 'long').slice(0, 2);

  const getWhereText = (_r?: RoadmapRow) => {
    const parts: string[] = [];
    if (spec.allocation.safe > 0) parts.push(`Safe (${spec.allocation.safe}%)`);
    if (spec.allocation.mid > 0) parts.push(`Mid (${spec.allocation.mid}%)`);
    if (spec.allocation.long > 0) parts.push(`Long (${spec.allocation.long}%)`);
    return parts.join(' · ') || 'Unallocated';
  };

  const getStatusText = (r: RoadmapRow) => {
    const logged = loggedMap[r.month];
    const isPast = r.month < currentMonth;
    const isCurrent = r.month === currentMonth;
    const s = rowStatus(logged, r.total, isPast, isCurrent);
    if (s === 'CURRENT') return 'Current month';
    if (s === 'UPCOMING') return 'Upcoming';
    if (s === 'NOT_LOGGED') return 'Not logged';
    if (s === 'AHEAD') return `Ahead (${inr(logged)})`;
    if (s === 'ON_TRACK') return `On track (${inr(logged)})`;
    return `Behind (${inr(logged)})`;
  };

  const handleExportCsv = () => {
    const csvContent = roadmapCsv(rows, getWhereText, getStatusText);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `corridor-roadmap-${spec.goalAmount}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Roadmap CSV exported', 'success');
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Monthly Ranges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink">
            Financial Roadmap
          </h1>
          <p className="text-sm text-muted mt-1">
            Month-by-month trajectory from start to {inrCompact(spec.goalAmount)}. Recomputes live with any plan change.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-ctl bg-surface border border-line hover:bg-surface-2 text-ink shadow-sm self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* 2. Monthly Summary Cards (Safe vs Investing ranges) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-panel bg-surface border border-line">
          <div className="text-xs uppercase tracking-wider font-semibold text-safe mb-1">
            Monthly Safe Saving
          </div>
          <div className="text-xl font-display font-bold text-ink num">
            {inr(savingRange[0])} – {inr(savingRange[1])}
          </div>
          <div className="text-xs text-muted mt-1">
            Safe bucket ({spec.allocation.safe}%) for cash cushion and liquidity.
          </div>
        </div>

        <div className="p-4 rounded-panel bg-surface border border-line">
          <div className="text-xs uppercase tracking-wider font-semibold text-accent mb-1">
            Monthly Investing
          </div>
          <div className="text-xl font-display font-bold text-ink num">
            {inr(investRange[0])} – {inr(investRange[1])}
          </div>
          <div className="text-xs text-muted mt-1">
            Mid & Long buckets ({spec.allocation.mid + spec.allocation.long}%) for long-term growth.
          </div>
        </div>

        <div className="p-4 rounded-panel bg-surface border border-line">
          <div className="text-xs uppercase tracking-wider font-semibold text-ink mb-1">
            Recommended Total
          </div>
          <div className="text-xl font-display font-bold text-accent num">
            {inr(range.base)}
            <span className="text-xs font-normal text-muted">/month</span>
          </div>
          <div className="text-xs text-muted mt-1">
            Range: {inr(range.min)} (lean) to {inr(range.max)} (cushion).
          </div>
        </div>
      </div>

      {/* 3. Cumulative Corridor Chart */}
      <div className="p-5 rounded-panel bg-surface border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink">Corridor of Outcomes</h3>
            <p className="text-xs text-muted">
              Likely growth line surrounded by the 15% range band. Solid dot indicates current actual savings.
            </p>
          </div>
          <span className="text-xs text-muted font-medium num">
            Target: {inr(spec.goalAmount)}
          </span>
        </div>
        <CorridorChart data={chartPoints} goalAmount={spec.goalAmount} height={240} showActual={true} />
      </div>

      {/* 4. Where to put it (today's research) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Where to put it (Today's research)</h3>
          <span className="text-xs text-muted">{marketSnapshot.updatedLabel}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Safe bucket */}
          <div className="p-4 rounded-panel bg-surface border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-safe tracking-wider">
                Safe bucket ({spec.allocation.safe}%)
              </span>
            </div>
            <div className="space-y-2">
              {safeItems.map((item) => (
                <div key={item.id} className="text-xs border-b border-line/60 pb-2 last:border-none">
                  <div className="font-semibold text-ink">{item.category}</div>
                  <div className="text-muted text-[11px] leading-relaxed mt-0.5">{item.why}</div>
                  <div className="text-safe font-medium mt-1 num">
                    {item.rateRange[0]}% – {item.rateRange[1]}% illustrative
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mid bucket */}
          <div className="p-4 rounded-panel bg-surface border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-mid tracking-wider">
                Mid bucket ({spec.allocation.mid}%)
              </span>
            </div>
            <div className="space-y-2">
              {midItems.map((item) => (
                <div key={item.id} className="text-xs border-b border-line/60 pb-2 last:border-none">
                  <div className="font-semibold text-ink">{item.category}</div>
                  <div className="text-muted text-[11px] leading-relaxed mt-0.5">{item.why}</div>
                  <div className="text-mid font-medium mt-1 num">
                    {item.rateRange[0]}% – {item.rateRange[1]}% illustrative
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Long bucket */}
          <div className="p-4 rounded-panel bg-surface border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-accent tracking-wider">
                Growth bucket ({spec.allocation.long}%)
              </span>
            </div>
            <div className="space-y-2">
              {longItems.map((item) => (
                <div key={item.id} className="text-xs border-b border-line/60 pb-2 last:border-none">
                  <div className="font-semibold text-ink">{item.category}</div>
                  <div className="text-muted text-[11px] leading-relaxed mt-0.5">{item.why}</div>
                  <div className="text-accent font-medium mt-1 num">
                    {item.rateRange[0]}% – {item.rateRange[1]}% illustrative
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Month-by-Month Table */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-ink">Schedule of Contributions</h3>
            <p className="text-xs text-muted">
              {spec.stepUpPct > 0
                ? `Includes ${spec.stepUpPct}% annual step-up compounding every 12 months.`
                : 'Steady monthly contributions.'}
            </p>
          </div>

          {/* Filter toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-ctl self-start sm:self-auto text-xs">
            <button
              onClick={() => {
                setFilterMode('12_MONTHS');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                filterMode === '12_MONTHS'
                  ? 'bg-surface text-ink shadow-xs font-semibold'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Next 12 months
            </button>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                filterMode === 'ALL'
                  ? 'bg-surface text-ink shadow-xs font-semibold'
                  : 'text-muted hover:text-ink'
              }`}
            >
              All {rows.length} months
            </button>
          </div>
        </div>

        {/* Desktop Table / Mobile Cards */}
        <div className="panel overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-line text-muted">
                <tr>
                  <th className="py-3 px-4 font-semibold">Month</th>
                  <th className="py-3 px-4 font-semibold">Saving (Safe)</th>
                  <th className="py-3 px-4 font-semibold">Investing (Mid+Long)</th>
                  <th className="py-3 px-4 font-semibold">Total Required</th>
                  <th className="py-3 px-4 font-semibold">Where</th>
                  <th className="py-3 px-4 font-semibold">Cumulative Target</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {paginatedRows.map((r) => {
                  const isCurrent = r.month === currentMonth;
                  const isPast = r.month < currentMonth;
                  const logged = loggedMap[r.month];
                  const st = rowStatus(logged, r.total, isPast, isCurrent);

                  return (
                    <tr
                      key={r.month}
                      className={`hover:bg-surface-2/30 transition-colors ${
                        isCurrent ? 'bg-accent/5 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{monthLabel(r.month)}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-accent text-on-accent font-bold">
                              Current
                            </span>
                          )}
                          {r.isQuarterEnd && (
                            <span className="p-0.5 rounded text-accent" title="Quarterly Milestone">
                              <Target className="w-3.5 h-3.5 inline" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-safe num">
                        {inr(r.saving[0])} – {inr(r.saving[1])}
                      </td>
                      <td className="py-3 px-4 text-accent num">
                        {inr(r.investing[0])} – {inr(r.investing[1])}
                      </td>
                      <td className="py-3 px-4 text-ink font-semibold num">
                        {inr(r.total[0])} – {inr(r.total[1])}
                      </td>
                      <td className="py-3 px-4 text-muted text-[11px]">{getWhereText(r)}</td>
                      <td className="py-3 px-4 text-ink font-semibold num">
                        {inr(r.cumulative)}
                      </td>
                      <td className="py-3 px-4">
                        {st === 'AHEAD' && (
                          <span className="text-accent font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ahead ({inr(logged)})
                          </span>
                        )}
                        {st === 'ON_TRACK' && (
                          <span className="text-accent font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> On track ({inr(logged)})
                          </span>
                        )}
                        {st === 'BEHIND' && (
                          <span className="text-loss font-semibold">Behind ({inr(logged)})</span>
                        )}
                        {st === 'NOT_LOGGED' && <span className="text-muted">Not logged</span>}
                        {st === 'CURRENT' && (
                          <span className="text-mid font-semibold">
                            {logged !== undefined ? `Logged: ${inr(logged)}` : 'Due this month'}
                          </span>
                        )}
                        {st === 'UPCOMING' && <span className="text-muted/60">Upcoming</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-line/60">
            {paginatedRows.map((r) => {
              const isCurrent = r.month === currentMonth;

              return (
                <div
                  key={r.month}
                  className={`p-4 space-y-2 text-xs ${isCurrent ? 'bg-accent/5' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-ink">{monthLabel(r.month)}</span>
                    <span className="font-semibold text-ink num">{inr(r.cumulative)} target</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-muted">
                    <div>Saving: <strong className="num text-safe">{inr(r.saving[0])}</strong></div>
                    <div>Investing: <strong className="num text-accent">{inr(r.investing[0])}</strong></div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-line/40 text-[11px]">
                    <span className="text-muted">{getWhereText(r)}</span>
                    <span className="font-semibold text-accent">{getStatusText(r)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination controls if in ALL view */}
          {filterMode === 'ALL' && totalPages > 1 && (
            <div className="p-3 border-t border-line flex items-center justify-between text-xs text-muted">
              <span>
                Page {page} of {totalPages} ({rows.length} total months)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-line disabled:opacity-40 hover:bg-surface-2"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded border border-line disabled:opacity-40 hover:bg-surface-2"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
