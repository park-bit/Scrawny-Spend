import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { getCategoryMeta, formatCompact, formatCurrency } from '../../utils';

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium">{d.label}</p>
      <p className="font-mono text-amber-300 mt-0.5">{formatCurrency(d.total)}</p>
      <p className="text-slate-400">{d.count} transactions</p>
    </div>
  );
}

export default function CategoryBarChart({ data = [] }) {
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    ...d,
    label: getCategoryMeta(d.category).label,
    color: getCategoryMeta(d.category).color,
    icon:  getCategoryMeta(d.category).icon,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
        barCategoryGap="25%"
      >
        <XAxis
          type="number"
          tickFormatter={formatCompact}
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]} animationDuration={500}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
