import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { MONTH_NAMES } from '../../constants';
import { formatCompact, formatCurrency } from '../../utils';

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-xl min-w-[130px]">
      <p className="text-slate-400 mb-1.5">{MONTH_NAMES[(d.month ?? 1) - 1]} {d.year}</p>
      <p className="font-mono font-medium text-amber-300 text-sm">{formatCurrency(d.total)}</p>
      {d.delta !== null && d.delta !== undefined && (
        <p className={`mt-0.5 ${d.delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
          {d.delta > 0 ? '↑' : '↓'} {Math.abs(d.deltaPercent ?? 0).toFixed(1)}% vs prev
        </p>
      )}
    </div>
  );
}

export default function TrendAreaChart({ data = [] }) {
  if (!data.length) return null;

  const labeled = data.map((d) => ({
    ...d,
    label: MONTH_NAMES[(d.month ?? 1) - 1],
  }));

  const max = Math.max(...labeled.map((d) => d.total));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={labeled} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={48}
          domain={[0, max * 1.15]}
        />
        <Tooltip content={<TrendTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#f59e0b"
          strokeWidth={2.5}
          fill="url(#areaGrad)"
          dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }}
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
