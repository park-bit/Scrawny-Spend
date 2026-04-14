import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Wallet } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

export default function Register() {
  const navigate  = useNavigate();
  const register  = useAuthStore((s) => s.register);

  const [form, setForm]       = useState({ name: '', email: '', password: '', currency: 'INR' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2)  e.name     = 'Name must be at least 2 characters';
    if (!form.email)                                  e.email    = 'Email is required';
    if (!form.password || form.password.length < 8)  e.password = 'Password must be at least 8 characters';
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) e.password = 'Must contain a letter and a number';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome 🎉');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Registration failed';
      toast.error(msg);
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (ev) => {
    setForm((f) => ({ ...f, [key]: ev.target.value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  return (
    <div className="min-h-screen min-h-dvh bg-navy-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-96 h-96 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-80 h-80 bg-indigo-500/6 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
      </div>

      <div className="w-full max-w-sm relative animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/20 mb-5 shadow-glow-amber">
            <Wallet size={28} className="text-amber-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-1 tracking-tight">
            Get started
          </h1>
          <p className="text-slate-400 text-sm">Create your Sc<span className="font-sans font-medium text-[1.1em] align-baseline">₹</span>awnySpend account</p>
        </div>

        {/* Form */}
        <div className="card p-6 space-y-4">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                className={`input ${errors.name ? 'border-red-500/50' : ''}`}
                placeholder="Aarav Shah"
                value={form.name}
                onChange={set('name')}
                autoComplete="name"
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className={`input ${errors.email ? 'border-red-500/50' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`input pr-11 ${errors.password ? 'border-red-500/50' : ''}`}
                  placeholder="Min 8 chars, 1 letter + 1 number"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div className="flex gap-1 mt-2">
                  {[1,2,3,4].map((i) => {
                    const strength = [
                      form.password.length >= 8,
                      /[A-Z]/.test(form.password),
                      /\d/.test(form.password),
                      /[^A-Za-z0-9]/.test(form.password),
                    ].filter(Boolean).length;
                    return (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        i <= strength
                          ? strength <= 1 ? 'bg-red-400'
                          : strength <= 2 ? 'bg-amber-400'
                          : strength <= 3 ? 'bg-green-400'
                          : 'bg-emerald-400'
                          : 'bg-white/10'
                      }`} />
                    );
                  })}
                </div>
              )}
              {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>}
            </div>

            {/* Currency */}
            <div>
              <label className="label">Default currency</label>
              <div className="grid grid-cols-4 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, currency: c }))}
                    className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                      form.currency === c
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-white/5 border-white/8 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              disabled={loading}
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                : <>Create account <ArrowRight size={16} /></>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
