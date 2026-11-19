// O bloqueio só esconde a tela. Não criptografa os dados.
// A senha é guardada com PBKDF2-SHA256, tempero aleatório e muitas voltas, para não ser fácil de descobrir.
const ITER = 150000, enc = new TextEncoder();
const b64 = u8 => btoa(String.fromCharCode(...u8)), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
async function derive(pin, salt, it) {
  const key = await crypto.subtle.importKey('raw', enc.encode('financas:' + pin), 'PBKDF2', false, ['deriveBits']);
  return b64(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, key, 256)));
}
// Formato antigo (só a conta simples): continua valendo para quem já tinha senha, até trocar.
const legacy = pin => { let h = 5381; for (const c of 'financas:' + pin) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(16); };
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

export const hasPin = s => !!s.prefs.pin;
export async function setPin(s, pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('A senha precisa ter 4 números.');
  const salt = crypto.getRandomValues(new Uint8Array(16)), r = structuredClone(s);
  r.prefs.pin = { v: 2, salt: b64(salt), it: ITER, hash: await derive(pin, salt, ITER) }; r.prefs.lock = null; return r;
}
export async function checkPin(s, pin) {
  const p = s.prefs.pin; if (!p) return false;
  if (typeof p === 'string') return same(p, legacy(String(pin)));
  return same(p.hash, await derive(String(pin), unb64(p.salt), p.it));
}
export async function clearPin(s, pin) {
  if (!(await checkPin(s, pin))) throw new Error('Senha atual incorreta.');
  const r = structuredClone(s); r.prefs.pin = null; r.prefs.lock = null; r.prefs.bio = null; return r;
}

// Limite de tentativas: a partir do 5º erro seguido, espera 30 s, depois dobra a cada erro (máximo 15 min).
export const lockWait = (s, nowMs) => Math.max(0, Math.ceil(((s.prefs.lock?.until || 0) - nowMs) / 1000));
export function registerFail(s, nowMs) {
  const r = structuredClone(s), fails = (s.prefs.lock?.fails || 0) + 1;
  r.prefs.lock = { fails, until: fails >= 5 ? nowMs + Math.min(900, 30 * 2 ** (fails - 5)) * 1000 : 0 }; return r;
}
export function registerOk(s) { if (!s.prefs.lock) return s; const r = structuredClone(s); r.prefs.lock = null; return r; }
