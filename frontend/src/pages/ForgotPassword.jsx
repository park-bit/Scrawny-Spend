import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, KeyRound } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { requestPasswordReset, resetPassword } = useAuthStore();

  const [step, setStep]       = useState(1);
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [password, setPassword] = useState('');
  
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const handleRequest = async (ev) => {
    ev.preventDefault();
    if (!email) { setErrors({ email: 'Email is required' }); return; }

    setLoading(true);
    try {
      await requestPasswordReset({ email });
      toast.success(`Reset code sent to ${email}`);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Request failed';
      toast.error(msg);
      setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (otp.length !== 6) e.otp = 'Code must be 6 digits';
    if (!password || password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) e.password = 'Must contain a letter and a number';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      await resetPassword({ email, otp, newPassword: password });
      toast.success('Password changed safely! Please login.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? 'Reset failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh bg-navy-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] w-80 h-80 bg-blue-500/6 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
      </div>

      <div className="w-full max-w-sm relative animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/20 mb-5 shadow-glow-amber">
            <KeyRound size={28} className="text-amber-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-1 tracking-tight">
            {step === 1 ? 'Reset Password' : 'New Password'}
          </h1>
          <p className="text-slate-400 text-sm">
            {step === 1 
              ? 'Enter your email to receive a code' 
              : `Code sent to ${email}`
            }
          </p>
        </div>

        {/* Form card */}
        <div className="card p-6 space-y-5">
          {step === 1 ? (
            <form onSubmit={handleRequest} noValidate className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className={`input ${errors.email ? 'border-red-500/50' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(errs => ({...errs, email: undefined})); }}
                  autoComplete="email"
                />
                {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
              </div>

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                disabled={loading}
              >
                {loading ? <span className="w-5 h-5 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" /> : <>Send Reset Code <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} noValidate className="space-y-4">
              <div>
                <label className="label">6-Digit Code</label>
                <input
                  type="text"
                  className={`input text-center tracking-[0.5em] text-xl font-bold ${errors.otp ? 'border-red-500/50' : ''}`}
                  placeholder="••••••"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    setErrors((errs) => ({ ...errs, otp: undefined }));
                  }}
                  autoFocus
                />
                {errors.otp && <p className="mt-1.5 text-xs text-center text-red-400">{errors.otp}</p>}
              </div>

              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={`input pr-11 ${errors.password ? 'border-red-500/50' : ''}`}
                    placeholder="Min 8 chars, 1 letter + 1 number"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(errs => ({...errs, password: undefined})); }}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>}
              </div>

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                disabled={loading}
              >
                {loading ? <span className="w-5 h-5 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" /> : <>Save Password <ArrowRight size={16} /></>}
              </button>

              <button
                type="button"
                className="w-full text-center text-sm text-slate-400 hover:text-white mt-4 transition-colors"
                onClick={() => setStep(1)}
              >
                Back to email
              </button>
            </form>
          )}
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
