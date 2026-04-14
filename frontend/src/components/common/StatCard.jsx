import { cn } from '../../utils';

export default function StatCard({ label, value, sub, icon, accent = false, trend, loading }) {
  if (loading) {
    return (
      <div className="card p-4 space-y-3">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-7 w-28 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
    );
  }

  return (
    <div className={cn(
      'card p-4 flex flex-col gap-1 transition-all duration-200 hover:-translate-y-0.5',
      accent && 'border-amber-500/20 shadow-glow-amber'
    )}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        {icon && <span className="text-lg opacity-70">{icon}</span>}
      </div>

      <p className={cn('stat-num text-2xl font-semibold', accent ? 'text-amber-300' : 'text-slate-100')}>
        {value}
      </p>

      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-1.5">
          {trend !== undefined && (
            <span className={cn(
              'text-xs font-medium',
              trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-slate-500'
            )}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
              {' '}{Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      )}
    </div>
  );
}
