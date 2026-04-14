import { CATEGORIES } from '../../constants';
import { cn } from '../../utils';

export default function CategoryPicker({ value, onChange, categories = CATEGORIES }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {categories.map((cat) => {
        const active = value === cat.value;
        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={cn(
              'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-150 active:scale-95',
              active
                ? 'border-transparent text-white'
                : 'border-white/8 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            )}
            style={active ? { background: `${cat.color}22`, borderColor: `${cat.color}44` } : {}}
          >
            <span className="text-xl leading-none">{cat.icon}</span>
            <span className="text-[10px] font-medium leading-tight text-center">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
