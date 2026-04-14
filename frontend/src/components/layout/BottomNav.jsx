import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Plus, Clock, BarChart3, Sparkles } from 'lucide-react';

export const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Home'      },
  { to: '/history',   icon: Clock,           label: 'History'   },
  { to: '/add',       icon: Plus,            label: 'Add',       fab: true },
  { to: '/analytics', icon: BarChart3,        label: 'Analytics' },
  { to: '/ai',        icon: Sparkles,         label: 'AI'        },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy-950/95 backdrop-blur-md border-t border-white/5 safe-bottom">
      <div className="flex items-center justify-around max-w-xl mx-auto px-2 h-16">
        {NAV.map(({ to, icon: Icon, label, fab }) => (
          fab ? (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative -top-5 flex items-center justify-center w-14 h-14 rounded-2xl shadow-glow-amber transition-all duration-200
                 ${isActive
                   ? 'bg-amber-400 text-black scale-105'
                   : 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95'
                 }`
              }
              aria-label="Add expense"
            >
              <Icon size={24} strokeWidth={2.5} />
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]
                 ${isActive
                   ? 'text-amber-400'
                   : 'text-slate-500 hover:text-slate-300'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-amber-400/10' : ''}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          )
        ))}
      </div>
    </nav>
  );
}
