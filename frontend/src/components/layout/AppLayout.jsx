import { Outlet, useNavigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { Settings } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function AppLayout() {
  const { user } = useAuthStore();

  return (
    <div className="flex bg-navy-950 text-slate-100 min-h-screen md:h-screen w-full font-sans">
      {/* ── Desktop Sidebar ────────────────────────────────── */}
      <Sidebar />

      {/* ── Main content wrapper ───────────────────────────── */}
      <div className="flex-1 flex flex-col md:ml-64 w-full h-full relative">
        
        {/* ── Mobile top header ───────────────────────────── */}
        <header className="md:hidden sticky top-0 z-40 bg-navy-950/80 backdrop-blur-md border-b border-white/5 safe-top">
          <div className="flex items-center justify-between px-4 h-14 max-w-xl mx-auto">
            <div className="flex items-center gap-2.5">
              <img src="/logo.jpg" alt="Logo" className="w-6 h-6 rounded-full object-cover shrink-0" />
              <span className="font-display font-bold text-xl tracking-tight flex items-center">
                <span className="bg-gradient-to-r from-blue-400 via-red-400 to-yellow-400 text-transparent bg-clip-text">
                  Sc<span className="font-sans font-bold text-[1.05em] translate-y-[-1px]">₹</span>awny
                </span>
                <span className="text-slate-100">Spend</span>
              </span>
            </div>

            <Link
              to="/settings"
              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </Link>
          </div>
        </header>

        {/* ── Page content ──────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
          <div className="max-w-xl md:max-w-5xl mx-auto px-4 py-6 md:py-10">
            <Outlet />
          </div>
        </main>

        {/* ── Mobile bottom navigation ──────────────────────── */}
        <BottomNav />
      </div>
    </div>
  );
}
