import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCreateExpense } from '../hooks/useExpenses';
import { aiService }        from '../services';
import CategoryPicker       from '../components/expenses/CategoryPicker';
import { PAYMENT_METHODS, CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants';
import { today }            from '../utils';

export default function AddExpense() {
  const navigate = useNavigate();
  const { mutateAsync: createExpense, isPending } = useCreateExpense();

  const [form, setForm] = useState({
    type:        'expense',
    description: '',
    amount:      '',
    category:    'other',
    date:        today(),
    paymentMethod: 'upi',
    tags:        '',
  });
  const [errors, setErrors]         = useState({});
  const [showAdvanced, setShowAdv]  = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [aiSuggestion, setAiSug]    = useState(null);   // { category, confidence }

  const debounceRef = useRef(null);

  const set = (key) => (ev) => {
    const val = ev.target ? ev.target.value : ev;
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));

    // Auto-classify on description change
    if (key === 'description') {
      clearTimeout(debounceRef.current);
      setAiSug(null);
      if (val.trim().length >= 4) {
        debounceRef.current = setTimeout(() => classifyDescription(val.trim()), 700);
      }
    }
  };

  const classifyDescription = async (description) => {
    setClassifying(true);
    try {
      const { data } = await aiService.classify({ description });
      const result   = data.data ?? data;
      if (result?.category && result.confidence > 0.35 && !result.fallback) {
        setAiSug(result);
        // Auto-apply if user hasn't manually changed category
        setForm((f) => ({ ...f, category: result.category }));
      }
    } catch {
      // AI unavailable – silent, user picks manually
    } finally {
      setClassifying(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.description.trim())            e.description = 'Description is required';
    if (!form.amount || isNaN(+form.amount)) e.amount      = 'Valid amount is required';
    if (+form.amount <= 0)                   e.amount      = 'Amount must be greater than 0';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const tags = form.tags
      ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    await createExpense({
      type:          form.type,
      description:   form.description.trim(),
      amount:        parseFloat(form.amount),
      category:      form.category,
      date:          form.date,
      paymentMethod: form.paymentMethod,
      tags,
    });

    navigate('/history');
  };

  const catLabel = CATEGORIES.find((c) => c.value === form.category)?.label ?? 'Other';

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Add Transaction</h1>
          <p className="text-slate-400 text-sm mt-0.5">AI will suggest a category automatically</p>
        </div>
      </div>

      <div className="flex bg-navy-900 rounded-xl p-1 mb-4 border border-white/5">
        <button 
          type="button"
          onClick={() => setForm(f => ({ ...f, type: 'expense', category: 'other' }))}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${form.type === 'expense' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Expense
        </button>
        <button 
          type="button"
          onClick={() => setForm(f => ({ ...f, type: 'income', category: 'salary' }))}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${form.type === 'income' ? 'bg-green-500 text-black shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Income
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* ── Description ──────────────────────────────────── */}
        <div className="card p-4 space-y-4">
          <div>
            <label className="label">
              {form.type === 'income' ? 'Income description' : 'What did you spend on?'}
            </label>
            <div className="relative">
              <input
                type="text"
                className={`input pr-10 ${errors.description ? 'border-red-500/50' : ''}`}
                placeholder={form.type === 'income' ? 'e.g. Monthly salary, freelance project...' : 'e.g. Zomato biryani, Uber ride…'}
                value={form.description}
                onChange={set('description')}
                autoFocus
              />
              {/* AI indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {classifying
                  ? <span className="w-4 h-4 border border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin inline-block" />
                  : aiSuggestion && <Sparkles size={15} className="text-indigo-400" />
                }
              </div>
            </div>
            {errors.description && <p className="mt-1.5 text-xs text-red-400">{errors.description}</p>}

            {/* AI suggestion badge */}
            {aiSuggestion && (
              <div className="mt-2 flex items-center gap-2 text-xs text-indigo-300 animate-fade-in">
                <CheckCircle2 size={12} />
                AI detected: <strong>{aiSuggestion.category}</strong>
                <span className="text-slate-500">({(aiSuggestion.confidence * 100).toFixed(0)}% confidence)</span>
              </div>
            )}
          </div>

          {/* ── Amount ─────────────────────────────────────── */}
          <div>
            <label className="label">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">₹</span>
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                className={`input pl-8 font-mono text-lg ${errors.amount ? 'border-red-500/50' : ''}`}
                placeholder="0.00"
                value={form.amount}
                onChange={set('amount')}
              />
            </div>
            {errors.amount && <p className="mt-1.5 text-xs text-red-400">{errors.amount}</p>}
          </div>

          {/* ── Date ───────────────────────────────────────── */}
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={form.date}
              max={today()}
              onChange={set('date')}
            />
          </div>
        </div>

        {/* ── Category picker ───────────────────────────────── */}
        <div className="card p-4">
          <label className="label mb-3">Category</label>
          <CategoryPicker 
            categories={form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES}
            value={form.category} 
            onChange={(v) => {
              setForm((f) => ({ ...f, category: v }));
              setAiSug(null); // user override
            }} 
          />
        </div>

        {/* ── Payment method ────────────────────────────────── */}
        <div className="card p-4">
          <label className="label mb-3">Payment method</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, paymentMethod: pm.value }))}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                  form.paymentMethod === pm.value
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium'
                    : 'bg-white/5 border-white/8 text-slate-400 hover:bg-white/10'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Advanced (tags) ──────────────────────────────── */}
        <button
          type="button"
          onClick={() => setShowAdv((v) => !v)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors w-full py-1"
        >
          {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          Advanced options
        </button>

        {showAdvanced && (
          <div className="card p-4 animate-slide-up">
            <label className="label">Tags (comma-separated)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. work, quarterly, one-time"
              value={form.tags}
              onChange={set('tags')}
            />
          </div>
        )}

        {/* ── Submit ────────────────────────────────────────── */}
        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base"
          disabled={isPending}
        >
          {isPending
            ? <span className="w-5 h-5 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
            : `Save ${form.type} · ${catLabel}`
          }
        </button>
      </form>
    </div>
  );
}
