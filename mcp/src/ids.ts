/**
 * Key and slug generation.
 *
 * Keys are short, opaque, prefixed base36 strings (`prt_xxxxx`, `doc_xxxxx`).
 * Slugs are derived from human titles and made unique within a scope.
 */

import { randomBytes } from "node:crypto";

/** Generate a short base36 token of `length` chars (default 5). */
function token(length = 5): string {
  // Pull more entropy than we need, then map to base36.
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    out += (bytes[i]! % 36).toString(36);
  }
  return out.padEnd(length, "0").slice(0, length);
}

export function portalKey(): string {
  return `prt_${token()}`;
}

export function docKey(): string {
  return `doc_${token()}`;
}

/**
 * Slugify an arbitrary string into a URL-safe slug. Falls back to a generated
 * token when the input has no usable characters.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
  return base.length > 0 ? base : `item-${token()}`;
}

/**
 * Make `slug` unique against a set of taken slugs by appending `-2`, `-3`, ...
 */
export function uniqueSlug(slug: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(slug)) return slug;
  let n = 2;
  while (set.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}
