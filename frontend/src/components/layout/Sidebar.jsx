import { NavLink } from 'react-router-dom';
import { Settings } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { NAV } from './BottomNav';

export default function Sidebar() {
  const { user } = useAuthStore();

  return (
    <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-navy-950 border-r border-white/5 z-50">
      <div className="flex items-center px-6 h-16 border-b border-white/5 shrink-0 gap-2.5">
        <img src="/logo.jpg" alt="Logo" className="w-6 h-6 rounded-full object-cover shrink-0" />
        <span className="font-display font-bold text-xl tracking-tight flex items-center">
          <span className="bg-gradient-to-r from-blue-400 via-red-400 to-yellow-400 text-transparent bg-clip-text">
            Sc<span className="font-sans font-bold text-[1.05em] translate-y-[-1px]">₹</span>awny
          </span>
          <span className="text-slate-100">Spend</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label, fab }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium
               ${isActive
                 ? 'bg-amber-400/10 text-amber-400'
                 : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
               }`
            }
          >
            <Icon size={20} className={fab ? 'text-amber-500' : ''} />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium mb-3
             ${isActive ? 'bg-amber-400/10 text-amber-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`
          }
        >
          <Settings size={20} />
          Settings
        </NavLink>

        <div className="flex items-center gap-3 px-3 py-2 bg-navy-900 rounded-xl border border-white/5">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold uppercase text-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
