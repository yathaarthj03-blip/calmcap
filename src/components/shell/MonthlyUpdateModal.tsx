import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { monthKey } from '../../engine/dates';
import { inr, parseMoney } from '../../engine/format';
import { useStore } from '../../store/useStore';
import { selectActivePlan } from '../../store/selectors';
import { Dialog } from '../ui/Dialog';

interface MonthlyUpdateModalProps {
  open: boolean;
  onClose: () => void;
  mandatory?: boolean;
}

export const MonthlyUpdateModal: React.FC<MonthlyUpdateModalProps> = ({ open, onClose, mandatory = false }) => {
  const holdings = useStore((s) => s.holdings);
  const income = useStore((s) => s.income);
  const activePlan = useStore(selectActivePlan);
  const logMonthlySavings = useStore((s) => s.logMonthlySavings);
  const updateIncome = useStore((s) => s.updateIncome);
  const showToast = useStore((s) => s.showToast);

  const currentMonthKey = monthKey(new Date());
  const monthName = format(new Date(), 'MMMM yyyy');

  const [amountStr, setAmountStr] = useState(String(activePlan.plan.monthlyAmount));
  const [primaryIncomeStr, setPrimaryIncomeStr] = useState(String(income.primary));
  const [sideIncomeStr, setSideIncomeStr] = useState(String(income.side));
  const [holdingId, setHoldingId] = useState<string | 'CASH'>('CASH');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmountStr(String(activePlan.plan.monthlyAmount));
      setPrimaryIncomeStr(String(income.primary));
      setSideIncomeStr(String(income.side));
      if (holdings.length > 0) {
        setHoldingId(holdings[0].id);
      } else {
        setHoldingId('CASH');
      }
      setError(null);
    }
  }, [open, activePlan.plan.monthlyAmount, income.primary, income.side, holdings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoney(amountStr);
    if (amount === null || amount < 0) {
      setError('Please enter a valid non-negative amount saved this month.');
      return;
    }

    const nextPrimary = parseMoney(primaryIncomeStr);
    const nextSide = parseMoney(sideIncomeStr) ?? 0;
    if (nextPrimary === null || nextPrimary <= 0) {
      setError('Primary income must be a valid positive rupee number.');
      return;
    }

    // Check if income changed
    if (nextPrimary !== income.primary || nextSide !== income.side) {
      updateIncome({
        ...income,
        primary: nextPrimary,
        side: nextSide,
      });
    }

    // Record ledger entry
    logMonthlySavings({
      month: currentMonthKey,
      amount,
      holdingId,
      incomeAtTime: nextPrimary + nextSide,
    });

    showToast(`Saved ${inr(amount)} for ${monthName}`, 'success');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !mandatory) onClose();
      }}
      title={`Monthly Update: ${monthName}`}
      description={
        mandatory
          ? 'Welcome to a new month. Log what you set aside this month to keep your roadmap accurate.'
          : 'Record what you saved or invested this month.'
      }
      closable={!mandatory}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 text-xs rounded-ctl bg-loss/10 text-loss border border-loss/20">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Amount saved or invested this month (₹)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="input num"
            placeholder="e.g. 5,109"
            required
            autoFocus
          />
          <p className="help mt-1">
            Recommended plan amount: <strong className="num text-ink">{inr(activePlan.plan.monthlyAmount)}</strong>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Where did this money go?
          </label>
          <select
            value={holdingId}
            onChange={(e) => setHoldingId(e.target.value)}
            className="input"
          >
            <option value="CASH">Cash savings (unallocated cash reserve)</option>
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.category.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-line">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Confirm your income as of today
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Primary income (₹)</label>
              <input
                type="text"
                inputMode="numeric"
                value={primaryIncomeStr}
                onChange={(e) => setPrimaryIncomeStr(e.target.value)}
                className="input num text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Side income (₹)</label>
              <input
                type="text"
                inputMode="numeric"
                value={sideIncomeStr}
                onChange={(e) => setSideIncomeStr(e.target.value)}
                className="input num text-sm"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 flex justify-end gap-3">
          {!mandatory && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-ctl border border-line text-ink hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-5 py-2 text-sm font-medium rounded-ctl bg-accent text-on-accent hover:opacity-90 transition-opacity"
          >
            Save this month's update
          </button>
        </div>
      </form>
    </Dialog>
  );
};
