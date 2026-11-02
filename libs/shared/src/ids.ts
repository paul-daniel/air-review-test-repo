/**
 * Prefixed, sortable identifiers: `<prefix>_<base36 time><base36 random>`.
 * Kept dependency-free so it works identically in the browser and in Node.
 */
export type IdPrefix = 'cus' | 'ord' | 'lin' | 'prd' | 'var' | 'tkt' | 'usr' | 'ses' | 'ret';

const RANDOM_LENGTH = 8;

export function createId(prefix: IdPrefix, now: () => number = Date.now): string {
  const time = now().toString(36);
  let random = '';
  while (random.length < RANDOM_LENGTH) {
    random += Math.random().toString(36).slice(2);
  }
  return `${prefix}_${time}${random.slice(0, RANDOM_LENGTH)}`;
}

export function hasPrefix(id: string, prefix: IdPrefix): boolean {
  return id.startsWith(`${prefix}_`);
}
