export const DATE_PRESETS = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_quarter', label: 'Last Quarter' },
  { id: 'this_year', label: 'This Year' },
  { id: 'last_90_days', label: 'Last 90 Days' },
  { id: 'custom', label: 'Custom Range' },
];

export function computePresetRange(presetId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (presetId) {
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }
    case 'last_quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const prevQuarter = (currentQuarter + 3) % 4;
      const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const from = new Date(year, prevQuarter * 3, 1);
      const to = new Date(year, (prevQuarter + 1) * 3, 0, 23, 59, 59, 999);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }
    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }
    case 'last_90_days':
    default: {
      const from = new Date(today);
      from.setDate(from.getDate() - 90);
      return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
    }
  }
}

