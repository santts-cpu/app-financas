// Digital (ou rosto/PIN do aparelho) como atalho opcional para entrar. Usa o desbloqueio do próprio aparelho (WebAuthn).
// Como o bloqueio inteiro, isso só esconde a tela: não criptografa nada. A senha de 4 números continua sendo o caminho principal.
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
const rnd = n => crypto.getRandomValues(new Uint8Array(n));

export async function bioSupported(env = globalThis) {
  try { return !!env.navigator?.credentials && !!(await env.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.()); } catch { return false; }
}
export async function registerBio(s, env = globalThis) {
  if (!s.prefs.pin) throw new Error('Crie a senha de 4 números antes de ligar a digital.');
  const cred = await env.navigator.credentials.create({ publicKey: {
    challenge: rnd(32), rp: { name: 'Meu Bolso' }, user: { id: rnd(16), name: 'meu-bolso', displayName: 'Meu Bolso' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000 } });
  if (!cred) throw new Error('Não foi possível ligar a digital.');
  const r = structuredClone(s); r.prefs.bio = { id: b64(cred.rawId) }; return r;
}
export async function checkBio(s, env = globalThis) {
  if (!s.prefs.bio) return false;
  try {
    const a = await env.navigator.credentials.get({ publicKey: { challenge: rnd(32), allowCredentials: [{ type: 'public-key', id: unb64(s.prefs.bio.id) }], userVerification: 'required', timeout: 60000 } });
    return !!a;
  } catch { return false; }
}
export function removeBio(s) { const r = structuredClone(s); r.prefs.bio = null; return r; }
