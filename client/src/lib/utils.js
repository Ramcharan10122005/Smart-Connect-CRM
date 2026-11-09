import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Merges Tailwind and conditional CSS classes
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a numeric value into currency string
 * @param {number|string} amount
 * @param {string} currency - e.g. 'USD', 'EUR', 'GBP'
 */
export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '$0';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `$${Number(amount).toLocaleString()}`;
  }
}

/**
 * Formats dates both relatively (e.g. "3 hours ago") or absolutely ("Nov 10, 2026")
 * @param {string|Date} date
 * @param {Object} options
 * @param {boolean} options.relative
 * @param {string} options.formatStr
 */
export function formatDate(date, { relative = false, formatStr = 'MMM d, yyyy' } = {}) {
  if (!date) return '';

  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '';

  if (relative) {
    return formatDistanceToNow(parsed, { addSuffix: true });
  }

  return format(parsed, formatStr);
}

/**
 * Generates 1-2 uppercase character initials from a full name or email
 * @param {string} name
 */
export function initials(name) {
  if (!name || typeof name !== 'string') return 'SC';

  const trimmed = name.trim();
  if (trimmed.includes('@')) {
    return trimmed.slice(0, 2).toUpperCase();
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default {
  cn,
  formatCurrency,
  formatDate,
  initials,
};
