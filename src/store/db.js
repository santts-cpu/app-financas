const DB = 'financas', STORE = 'kv', KEY = 'state';

// Modelo inicial de categorias: a pessoa pode editar, arquivar ou apagar qualquer uma.
const CAT_PADRAO = [
  ['e', 'Moradia', '#2B4EFF'], ['e', 'Mercado', '#2FA97A'], ['e', 'Alimentação', '#E07A3A'], ['e', 'Transporte', '#E0A100'],
  ['e', 'Saúde', '#D12F4B'], ['e', 'Educação', '#8A5CE0'], ['e', 'Lazer', '#2B4EFF'], ['e', 'Assinaturas', '#8A5CE0'], ['e', 'Outros', '#E0A100'],
  ['r', 'Salário', '#2FA97A'], ['r', 'Rendimentos', '#2B4EFF'], ['r', 'Outras receitas', '#E0A100'],
];
export const initialState = () => ({
  tx: [], accounts: [], cards: [], cats: [], plans: {}, metas: [], assin: [], favs: [],
  cap: { seq: 1, classes: [{ n: 'Reserva', meta: 0, fora: true }], items: [] },
  bar: ['inicio', 'lanc', 'contas', 'plano', 'capital'],
  home: ['saldo', 'pend', 'contas', 'cartoes', 'plano', 'ultimos'],
  prefs: { hideVals: false, alertOn: true, alertThr: 90, alertHide: [], pin: null, lock: null, bio: null },
  meta: { version: 1, lastBackup: null, nid: 1 },
});

// Estado de quem abre o app pela primeira vez (ou apaga tudo): vazio, mas com o modelo de categorias.
export const freshState = () => {
  const s = initialState();
  s.cats = CAT_PADRAO.map(([type, name, color]) => ({ id: s.meta.nid++, name, type, color, subs: [], arch: false }));
  return s;
};

const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const run = async (mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), out = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(out && 'result' in out ? out.result : undefined); };
    t.onerror = t.onabort = () => { db.close(); rej(t.error); };
  });
};

export async function load() { return (await run('readonly', s => s.get(KEY))) ?? freshState(); }
export const save = state => run('readwrite', s => { s.put(structuredClone(state), KEY); });
export const clear = () => run('readwrite', s => { s.delete(KEY); });
export async function requestPersist() {
  try { return typeof navigator !== 'undefined' && navigator.storage?.persist ? await navigator.storage.persist() : false; }
  catch { return false; }
}
