import { useState } from 'react';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExpenses } from '../hooks/useExpenses';
import ExpenseItem    from '../components/expenses/ExpenseItem';
import FilterBar      from '../components/expenses/FilterBar';
import EmptyState     from '../components/common/EmptyState';
import Spinner        from '../components/common/Spinner';
import { formatCurrency } from '../utils';

const DEFAULT_FILTERS = { page: 1, limit: 15, sortBy: 'date', sortOrder: 'desc' };

export default function History() {
  const [filters,    setFilters]    = useState(DEFAULT_FILTERS);
  const [showFilter, setShowFilter] = useState(false);

  const { data, isLoading, isFetching } = useExpenses(filters);

  const expenses  = data?.data ?? [];
  const meta      = data?.meta ?? {};
  const total     = meta.total ?? 0;
  const totalPages = meta.totalPages ?? 1;

  // Sum of current page
  const pageTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const nextPage = () => setFilters((f) => ({ ...f, page: f.page + 1 }));
  const prevPage = () => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }));

  const hasFilters = !!(
    filters.category || filters.paymentMethod ||
    filters.search || filters.startDate || filters.endDate
  );

  return (
    <div className="space-y-4 animate-slide-up">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">History</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            {total} expense{total !== 1 ? 's' : ''}
            {hasFilters ? ' matching filters' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`p-2.5 rounded-xl border transition-all ${
            showFilter || hasFilters
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'bg-white/5 border-white/8 text-slate-400 hover:text-slate-200'
          }`}
        >
          {hasFilters ? <X size={18} /> : <SlidersHorizontal size={18} />}
        </button>
      </div>

      {/* ── Filter panel ─────────────────────────────────────── */}
      {showFilter && (
        <div className="card p-4 animate-slide-up">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onReset={() => { setFilters(DEFAULT_FILTERS); setShowFilter(false); }}
          />
        </div>
      )}

      {/* ── Sort bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {['date', 'amount'].map((field) => (
          <button
            key={field}
            onClick={() => setFilters((f) => ({
              ...f,
              sortBy: field,
              sortOrder: f.sortBy === field && f.sortOrder === 'desc' ? 'asc' : 'desc',
              page: 1,
            }))}
            className={`px-3 py-1 rounded-full text-xs border flex items-center gap-1 transition-all ${
              filters.sortBy === field
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/5 border-white/8 text-slate-500 hover:bg-white/8'
            }`}
          >
            {field === 'date' ? '📅' : '💰'}
            {field.charAt(0).toUpperCase() + field.slice(1)}
            {filters.sortBy === field && (
              <span>{filters.sortOrder === 'desc' ? '↓' : '↑'}</span>
            )}
          </button>
        ))}
        {isFetching && <Spinner size="sm" className="ml-auto" />}
      </div>

      {/* ── Expense list ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="card p-4 space-y-4">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-36 rounded" />
                <div className="skeleton h-2.5 w-24 rounded" />
              </div>
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No expenses found"
          description={hasFilters ? 'Try adjusting your filters' : 'Add your first expense to get started'}
        />
      ) : (
        <div className="card p-4">
          <div className="divide-y divide-white/5">
            {expenses.map((e) => (
              <ExpenseItem key={e._id || e.id} expense={e} showDelete />
            ))}
          </div>

          {/* Page total */}
          {expenses.length > 0 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
              <span className="text-xs text-slate-500">Page total</span>
              <span className="stat-num text-sm font-semibold text-amber-300">
                {formatCurrency(pageTotal)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prevPage}
            disabled={filters.page <= 1}
            className="btn-ghost px-4 py-2 flex items-center gap-1.5 text-sm disabled:opacity-30"
          >
            <ChevronLeft size={15} /> Prev
          </button>
          <span className="text-xs text-slate-400 font-mono">
            {filters.page} / {totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={filters.page >= totalPages}
            className="btn-ghost px-4 py-2 flex items-center gap-1.5 text-sm disabled:opacity-30"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
