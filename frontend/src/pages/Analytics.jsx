import { useState } from 'react';
import { useAnalyticsSummary, useAnalyticsTrends, useTopExpenses } from '../hooks/useAnalytics';
import { useExpenseSummary }  from '../hooks/useExpenses';
import SpendingPieChart   from '../components/charts/SpendingPieChart';
import TrendAreaChart     from '../components/charts/TrendAreaChart';
import CategoryBarChart   from '../components/charts/CategoryBarChart';
import EmptyState         from '../components/common/EmptyState';
import { formatCurrency, getCategoryMeta } from '../utils';
import { MONTH_NAMES } from '../constants';

const TABS = ['Overview', 'Trends', 'Categories', 'Top Spends'];

export default function Analytics() {
  const [tab, setTab]     = useState('Overview');
  const [months, setMonths] = useState(6);

  const now  = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: summary,  isLoading: sumLoading }  = useAnalyticsSummary({ year, month });
  const { data: trends,   isLoading: trendLoading } = useAnalyticsTrends({ months });
  const { data: topData,  isLoading: topLoading }   = useTopExpenses({ k: 10 });
  const { data: monthlySummary }                     = useExpenseSummary({ year, month });

  const byCategory = monthlySummary?.data?.byCategory ?? summary?.byCategory ?? [];
  const trendList  = Array.isArray(trends) ? trends : [];
  const topList    = topData?.topExpenses ?? [];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {MONTH_NAMES[month - 1]} {year} · deep dive
        </p>
      </div>

      {/* ── Summary strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Income',   value: summary?.totalIncome   ?? 0, color: 'text-green-400' },
          { label: 'Expenses', value: summary?.totalExpenses ?? 0, color: 'text-red-400'   },
          { label: 'Saved',    value: summary?.savingsRate != null ? `${summary.savingsRate}%` : '—', color: 'text-amber-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`stat-num text-sm font-semibold ${color}`}>
              {typeof value === 'number' ? formatCurrency(value) : value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tab bar ───────────────────────────────────────────── */}
      <div className="flex gap-1 bg-navy-900 p-1 rounded-xl border border-white/5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
              tab === t
                ? 'bg-amber-500 text-navy-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────── */}
      {tab === 'Overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* Balance card */}
          <div className="card p-4">
            <p className="label mb-2">Net balance · {MONTH_NAMES[month - 1]}</p>
            <p className={`stat-num text-3xl font-semibold ${
              (summary?.balance ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {formatCurrency(summary?.balance ?? 0)}
            </p>
            {summary?.savingsRate != null && (
              <p className="text-xs text-slate-400 mt-2">
                You saved <strong className="text-amber-300">{summary.savingsRate}%</strong> of your income this month.
              </p>
            )}
          </div>

          {/* Pie chart */}
          <div className="card p-4">
            <p className="label mb-3">Spending by category</p>
            {sumLoading
              ? <div className="skeleton h-56 rounded-xl" />
              : byCategory.length
                ? <SpendingPieChart data={byCategory} />
                : <EmptyState icon="📊" title="No data yet" description="Add expenses to see breakdown" />
            }
          </div>
        </div>
      )}

      {/* ── Trends tab ───────────────────────────────────────── */}
      {tab === 'Trends' && (
        <div className="space-y-4 animate-fade-in">
          {/* Month range selector */}
          <div className="flex gap-2 justify-end">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1 rounded-full text-xs border transition-all ${
                  months === m
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-white/5 border-white/8 text-slate-400 hover:bg-white/10'
                }`}
              >
                {m}M
              </button>
            ))}
          </div>

          <div className="card p-4">
            <p className="label mb-3">Monthly spending ({months} months)</p>
            {trendLoading
              ? <div className="skeleton h-48 rounded-xl" />
              : trendList.length
                ? <TrendAreaChart data={trendList} />
                : <EmptyState icon="📈" title="Not enough data" description="Keep adding expenses to see trends" />
            }
          </div>

          {/* MoM delta table */}
          {trendList.length > 1 && (
            <div className="card p-4">
              <p className="label mb-3">Month-over-month</p>
              <div className="space-y-2">
                {trendList.slice(-4).reverse().map((d) => (
                  <div key={`${d.year}-${d.month}`} className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-300">
                      {MONTH_NAMES[(d.month ?? 1) - 1]} {d.year}
                    </span>
                    <div className="flex items-center gap-3">
                      {d.delta !== null && d.delta !== undefined && (
                        <span className={`text-xs font-medium ${d.delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {d.delta > 0 ? '↑' : '↓'}{Math.abs(d.deltaPercent ?? 0).toFixed(1)}%
                        </span>
                      )}
                      <span className="stat-num text-sm font-medium text-slate-200">
                        {formatCurrency(d.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Categories tab ───────────────────────────────────── */}
      {tab === 'Categories' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-4">
            <p className="label mb-3">Spend by category · {MONTH_NAMES[month - 1]}</p>
            {sumLoading
              ? <div className="skeleton h-52 rounded-xl" />
              : byCategory.length
                ? <CategoryBarChart data={byCategory} />
                : <EmptyState icon="📂" title="No categories yet" />
            }
          </div>

          {/* Category detail rows */}
          {byCategory.length > 0 && (
            <div className="card divide-y divide-white/5">
              {byCategory.map((cat) => {
                const meta  = getCategoryMeta(cat.category);
                const total = byCategory.reduce((s, c) => s + c.total, 0);
                const pct   = total > 0 ? (cat.total / total) * 100 : 0;
                return (
                  <div key={cat.category} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm text-slate-200">{meta.label}</span>
                        <span className="stat-num text-sm font-medium" style={{ color: meta.color }}>
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: meta.color }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{cat.count} items · {pct.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Top Spends tab ───────────────────────────────────── */}
      {tab === 'Top Spends' && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs text-slate-500">Top 10 highest single expenses</p>
          {topLoading ? (
            <div className="card p-4 space-y-3">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-7 h-7 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-2.5 w-20 rounded" />
                  </div>
                  <div className="skeleton h-4 w-14 rounded" />
                </div>
              ))}
            </div>
          ) : topList.length === 0 ? (
            <EmptyState icon="🏆" title="No expenses yet" />
          ) : (
            <div className="card divide-y divide-white/5">
              {topList.map((exp, i) => {
                const meta = getCategoryMeta(exp.category);
                return (
                  <div key={exp._id || i} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-mono text-slate-500 w-5 text-right flex-shrink-0">
                      #{i + 1}
                    </span>
                    <span className="text-lg flex-shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{exp.description}</p>
                      <p className="text-xs text-slate-500">{meta.label}</p>
                    </div>
                    <span className="stat-num text-sm font-semibold text-slate-100">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
