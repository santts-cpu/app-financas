export const fmtDate = iso => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
export const monthKey = iso => iso.slice(0, 7);
export function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number), t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
