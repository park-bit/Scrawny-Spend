import { CATEGORY_MAP } from '../constants';

/** Format a number as INR currency */
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Format a number with K/L suffixes for compact display */
export const formatCompact = (amount) => {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000)   return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount}`;
};

/** Format a date string to a readable format */
export const formatDate = (dateStr, opts = {}) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', ...opts,
  });
};

/** Format a date for input[type=date] */
export const toInputDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  return new Date(dateStr).toISOString().slice(0, 10);
};

/** Get today's date as YYYY-MM-DD */
export const today = () => new Date().toISOString().slice(0, 10);

/** Get category metadata */
export const getCategoryMeta = (value) =>
  CATEGORY_MAP[value] ?? { label: value, icon: '📦', color: '#94a3b8' };

/** Clamp a number between min and max */
export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/** Truncate text */
export const truncate = (str, len = 40) =>
  str?.length > len ? str.slice(0, len) + '…' : str;

/** Classnames helper */
export const cn = (...classes) => classes.filter(Boolean).join(' ');
