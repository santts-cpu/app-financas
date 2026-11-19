// O bloqueio só esconde a tela. Não criptografa os dados.
const hash = pin => { let h = 5381; for (const c of 'financas:' + pin) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(16); };
export const hasPin = s => !!s.prefs.pin;
export function setPin(s, pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('A senha precisa ter 4 números.');
  const r = structuredClone(s); r.prefs.pin = hash(pin); return r;
}
export const checkPin = (s, pin) => hasPin(s) && s.prefs.pin === hash(pin);
export function clearPin(s, pin) {
  if (!checkPin(s, pin)) throw new Error('Senha atual incorreta.');
  const r = structuredClone(s); r.prefs.pin = null; return r;
}
