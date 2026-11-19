// Cor livre: sempre #rrggbb (o mesmo formato do <input type="color">).
export const isHex = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
export const needHex = c => { if (!isHex(c)) throw new Error('Escolha uma cor válida.'); };
