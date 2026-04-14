// Mirror backend Expense model enums exactly
export const EXPENSE_CATEGORIES = [
  { value: 'food',          label: 'Food & Dining',    icon: '🍽️',  color: '#f59e0b' },
  { value: 'transport',     label: 'Transport',         icon: '🚗',  color: '#38bdf8' },
  { value: 'utilities',     label: 'Utilities',         icon: '⚡',  color: '#818cf8' },
  { value: 'entertainment', label: 'Entertainment',     icon: '🎬',  color: '#fb7185' },
  { value: 'health',        label: 'Health',            icon: '💊',  color: '#34d399' },
  { value: 'shopping',      label: 'Shopping',          icon: '🛍️',  color: '#f472b6' },
  { value: 'education',     label: 'Education',         icon: '📚',  color: '#60a5fa' },
  { value: 'travel',        label: 'Travel',            icon: '✈️',  color: '#4ade80' },
  { value: 'other',         label: 'Other',             icon: '📦',  color: '#94a3b8' },
];

export const INCOME_CATEGORIES = [
  { value: 'salary',        label: 'Salary',           icon: '💼',  color: '#22c55e' },
  { value: 'freelance',     label: 'Freelance',        icon: '💻',  color: '#4ade80' },
  { value: 'business',      label: 'Business',         icon: '🏢',  color: '#10b981' },
  { value: 'investment',    label: 'Investment',       icon: '📈',  color: '#059669' },
  { value: 'gift',          label: 'Gift',             icon: '🎁',  color: '#86efac' },
  { value: 'other_income',  label: 'Other Income',     icon: '💰',  color: '#84cc16' },
];

export const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const PAYMENT_METHODS = [
  { value: 'cash',       label: 'Cash' },
  { value: 'upi',        label: 'UPI' },
  { value: 'card',       label: 'Card' },
  { value: 'netbanking', label: 'Net Banking' },
  { value: 'wallet',     label: 'Wallet' },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
);

export const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

export const API_BASE = import.meta.env.VITE_API_URL || '/api';
