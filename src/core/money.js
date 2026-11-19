// Dinheiro sempre em centavos inteiros.
export function toCents(v) {
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function fmtMoney(cents) {
  const neg = cents < 0, abs = Math.abs(Math.round(cents));
  const int = Math.floor(abs / 100), dec = String(abs % 100).padStart(2, '0');
  const body = 'R$ ' + String(int).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
  return neg ? '− ' + body : body;
}

export function parseMoney(text) {
  let t = String(text).trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
  if (!/^-?[\d.,]+$/.test(t)) return null;
  const neg = t.startsWith('-'); if (neg) t = t.slice(1);
  if (t.includes(',')) {
    const [int, dec = '', ...more] = t.split(',');
    if (more.length || dec.length > 2 || !/^\d{1,3}(\.\d{3})*$|^\d*$/.test(int)) return null;
    t = int.replace(/\./g, '') + '.' + dec;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  else if (!/^\d*(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n > 1e11) return null;
  const c = Math.round(n * 100);
  return neg ? -c : c;
}
