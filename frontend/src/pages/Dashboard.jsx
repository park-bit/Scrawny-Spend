import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, TrendingDown, Minus, Plus, Sparkles } from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from 'recharts';

import useAuthStore        from '../store/authStore';
import { useAnalyticsSummary } from '../hooks/useAnalytics';
import { useExpenses, useExpenseTrends } from '../hooks/useExpenses';
import StatCard            from '../components/common/StatCard';
import ExpenseItem         from '../components/expenses/ExpenseItem';
import EmptyState          from '../components/common/EmptyState';
import { formatCurrency, formatCompact, getCategoryMeta, cn } from '../utils';
import { MONTH_NAMES } from '../constants';

function MiniTrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400">{MONTH_NAMES[(payload[0].payload.month ?? 1) - 1]}</p>
      <p className="font-mono font-medium text-amber-300">{formatCompact(payload[0].value)}</p>
    </div>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const now = new Date();
  const summaryParams = { year: now.getFullYear(), month: now.getMonth() + 1 };

  const { data: summary, isLoading: sumLoading } = useAnalyticsSummary(summaryParams);
  const { data: trendsData, isLoading: trendLoading } = useExpenseTrends({ months: 6 });
  const { data: recentData, isLoading: recentLoading } = useExpenses({ page: 1, limit: 5, sortBy: 'date', sortOrder: 'desc' });

  const trends  = trendsData?.data ?? [];
  const recent  = recentData?.data ?? [];

  // Month-over-month delta from trends
  const lastTwo = trends.slice(-2);
  const momDelta = lastTwo.length === 2 && lastTwo[0].total > 0
    ? ((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100
    : null;

  const totalExpenses = summary?.totalExpenses ?? 0;
  const balance       = summary?.balance       ?? 0;
  const savingsRate   = summary?.savingsRate;

  // Top category this month
  const topCat = summary?.byCategory?.[0];

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* ── Greeting ───────────────────────────────────────── */}
      <div>
        <p className="text-slate-400 text-sm">{greeting()},</p>
        <h1 className="font-display text-2xl font-bold text-white mt-0.5">
          {user?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
      </div>

      {/* ── Balance hero card ──────────────────────────────── */}
      <div className="card p-5 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/6 rounded-full blur-2xl pointer-events-none" />

        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
          {MONTH_NAMES[now.getMonth()]} Balance
        </p>
        <p className={cn(
          'font-mono text-4xl font-semibold mb-4',
          balance >= 0 ? 'text-emerald-400' : 'text-red-400'
        )}>
          {formatCurrency(balance)}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <TrendingUp size={12} className="text-green-400" /> Income
            </div>
            <p className="stat-num text-sm font-semibold text-green-400">
              {formatCurrency(summary?.totalIncome ?? 0)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <TrendingDown size={12} className="text-red-400" /> Expenses
            </div>
            <p className="stat-num text-sm font-semibold text-red-400">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Savings rate"
          value={savingsRate !== null && savingsRate !== undefined ? `${savingsRate}%` : '—'}
          sub="this month"
          icon="💰"
          accent={savingsRate > 20}
          loading={sumLoading}
        />
        <StatCard
          label="vs last month"
          value={momDelta !== null ? `${momDelta > 0 ? '+' : ''}${momDelta.toFixed(1)}%` : '—'}
          sub="spending change"
          icon={momDelta > 0 ? '📈' : momDelta < 0 ? '📉' : '➡️'}
          loading={trendLoading}
        />
      </div>

      {/* ── Spend trend mini chart ─────────────────────────── */}
      {trends.length > 1 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-semibold text-slate-200">6-month trend</h2>
            <Link to="/analytics" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              Details <ArrowRight size={12} />
            </Link>
          </div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" hide />
                <Tooltip content={<MiniTrendTooltip />} />
                <Area
                  type="monotone" dataKey="total"
                  stroke="#f59e0b" strokeWidth={2}
                  fill="url(#trendGrad)"
                  dot={false} activeDot={{ r: 4, fill: '#f59e0b' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Top category ───────────────────────────────────── */}
      {topCat && (
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `${getCategoryMeta(topCat.category).color}18` }}>
            {getCategoryMeta(topCat.category).icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Top category</p>
            <p className="font-medium text-slate-100 capitalize">{topCat.category}</p>
          </div>
          <p className="stat-num font-semibold text-amber-300">{formatCompact(topCat.total)}</p>
        </div>
      )}

      {/* ── Recent expenses ────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-slate-200">Recent expenses</h2>
          <Link to="/history" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
            See all <ArrowRight size={12} />
          </Link>
        </div>

        {recentLoading && (
          <div className="space-y-4">
            {[1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-32 rounded" />
                  <div className="skeleton h-2.5 w-20 rounded" />
                </div>
                <div className="skeleton h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        )}

        {!recentLoading && recent.length === 0 && (
          <EmptyState
            icon="💸"
            title="No expenses yet"
            description="Tap + to log your first expense"
            action={
              <Link to="/add" className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={15} /> Add expense
              </Link>
            }
          />
        )}

        {!recentLoading && recent.length > 0 && (
          <div className="divide-y divide-white/5">
            {recent.map((e) => (
              <ExpenseItem key={e._id || e.id} expense={e} />
            ))}
          </div>
        )}
      </div>

      {/* ── AI shortcut ────────────────────────────────────── */}
      <Link
        to="/ai"
        className="card p-4 flex items-center gap-4 border-indigo-500/15 hover:border-indigo-400/30 transition-all active:scale-[0.99]"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-indigo-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200">AI Insights</p>
          <p className="text-xs text-slate-500">Anomalies, predictions & tips</p>
        </div>
        <ArrowRight size={16} className="text-slate-600" />
      </Link>
    </div>
  );
}
