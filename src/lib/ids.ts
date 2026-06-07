// Short, prefixed, paste-able stable keys (Stripe/Linear style): prt_x7Fk2q, doc_a91bd3.
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function shortId(len = 6): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[a[i] % ALPHABET.length];
  return s;
}

export const portalKey = () => `prt_${shortId(7)}`;
export const docKey = () => `doc_${shortId(7)}`;
export const accessKey = () => `tk_${shortId(5)}_${shortId(5)}`;
export const uid = () => crypto.randomUUID();

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";
}
