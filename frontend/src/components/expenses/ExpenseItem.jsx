import { Trash2, AlertTriangle } from 'lucide-react';
import { getCategoryMeta, formatCurrency, formatDate, truncate } from '../../utils';
import { useDeleteExpense } from '../../hooks/useExpenses';

export default function ExpenseItem({ expense, showDelete = false }) {
  const { mutate: remove, isPending } = useDeleteExpense();
  const meta = getCategoryMeta(expense.category);

  const handleDelete = () => {
    if (window.confirm('Delete this expense?')) remove(expense._id || expense.id);
  };

  return (
    <div className="flex items-center gap-3 py-3 px-1 group animate-fade-in">
      {/* Category icon bubble */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
        style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}28` }}
      >
        {meta.icon}
      </div>

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-slate-200 truncate">
            {truncate(expense.description, 32)}
          </p>
          {expense.isAnomaly && (
            <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" title="Anomaly detected" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500">{formatDate(expense.date, { day: '2-digit', month: 'short' })}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: `${meta.color}18`, color: meta.color }}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex items-center gap-2">
        <span className="stat-num text-sm font-semibold text-slate-100">
          {formatCurrency(expense.amount)}
        </span>

        {showDelete && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
