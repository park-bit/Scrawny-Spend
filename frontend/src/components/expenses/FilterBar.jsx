import { X } from 'lucide-react';
import { CATEGORIES, PAYMENT_METHODS } from '../../constants';
import { cn } from '../../utils';

export default function FilterBar({ filters, onChange, onReset }) {
  const set = (key, val) => onChange({ ...filters, [key]: val, page: 1 });
  const hasActive = filters.category || filters.paymentMethod || filters.startDate || filters.search;

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        type="search"
        className="input text-sm"
        placeholder="Search description or tag…"
        value={filters.search ?? ''}
        onChange={(e) => set('search', e.target.value || undefined)}
      />

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => set('category', undefined)}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
            !filters.category
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-white/5 border-white/8 text-slate-400 hover:bg-white/10'
          )}
        >All</button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => set('category', filters.category === c.value ? undefined : c.value)}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              filters.category === c.value
                ? 'border-transparent text-white'
                : 'bg-white/5 border-white/8 text-slate-400 hover:bg-white/10'
            )}
            style={filters.category === c.value
              ? { background: `${c.color}25`, borderColor: `${c.color}50` }
              : {}}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Payment method row */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => set('paymentMethod', undefined)}
          className={cn(
            'flex-shrink-0 px-3 py-1 rounded-full text-xs border transition-all',
            !filters.paymentMethod
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-white/5 border-white/8 text-slate-500 hover:bg-white/10'
          )}
        >Any payment</button>
        {PAYMENT_METHODS.map((pm) => (
          <button
            key={pm.value}
            onClick={() => set('paymentMethod', filters.paymentMethod === pm.value ? undefined : pm.value)}
            className={cn(
              'flex-shrink-0 px-3 py-1 rounded-full text-xs border transition-all',
              filters.paymentMethod === pm.value
                ? 'bg-white/15 border-white/25 text-white font-medium'
                : 'bg-white/5 border-white/8 text-slate-500 hover:bg-white/10'
            )}
          >
            {pm.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">From</label>
          <input
            type="date"
            className="input text-xs py-2"
            value={filters.startDate ?? ''}
            onChange={(e) => set('startDate', e.target.value || undefined)}
          />
        </div>
        <div>
          <label className="label text-[10px]">To</label>
          <input
            type="date"
            className="input text-xs py-2"
            value={filters.endDate ?? ''}
            onChange={(e) => set('endDate', e.target.value || undefined)}
          />
        </div>
      </div>

      {/* Clear */}
      {hasActive && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <X size={12} /> Clear filters
        </button>
      )}
    </div>
  );
}
