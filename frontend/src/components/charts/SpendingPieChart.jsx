import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getCategoryMeta, formatCurrency } from '../../utils';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-slate-200">{d.name}</p>
      <p className="font-mono text-amber-300 mt-0.5">{formatCurrency(d.value)}</p>
      <p className="text-slate-400">{d.payload.percent?.toFixed(1)}% of total</p>
    </div>
  );
}

function CustomLegend({ payload }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

export default function SpendingPieChart({ data = [] }) {
  if (!data.length) return null;

  const total = data.reduce((s, d) => s + d.total, 0);
  const chartData = data.map((d) => ({
    name:    getCategoryMeta(d.category).label,
    value:   d.total,
    color:   getCategoryMeta(d.category).color,
    percent: total > 0 ? (d.total / total) * 100 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={3}
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
