/**
 * Thesis data layer.
 *
 * A single `ContentStore` interface (read/write/version/snapshot) is the seam the
 * whole app talks to. v1 ships a localStorage implementation; a Supabase/git-backed
 * implementation drops in behind the same interface without touching the UI.
 */
import { useSyncExternalStore } from "react";
import { portalKey, docKey, accessKey as genAccessKey, uid, slugify } from "./ids";

export type AccessPolicy = "public" | "gated";
export type SourceType = "inline" | "gist" | "github" | "upload";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}
export interface Portal {
  id: string;
  key: string;
  name: string;
  slug: string;
  accessPolicy: AccessPolicy;
  domains: string[];
  createdAt: string;
}
export interface Section {
  id: string;
  portalId: string;
  name: string;
  position: number;
}
export interface Doc {
  id: string;
  key: string;
  portalId: string;
  sectionId: string | null;
  title: string;
  slug: string;
  draft: string;
  published: string | null;
  publishedAt: string | null;
  source: { type: SourceType; ref?: string };
  position: number;
  createdAt: string;
  updatedAt: string;
}
export interface AccessKey {
  id: string;
  key: string;
  portalId: string;
  label: string;
  status: "active" | "revoked";
  createdAt: string;
}

interface State {
  workspace: Workspace | null;
  portals: Portal[];
  sections: Section[];
  docs: Doc[];
  accessKeys: AccessKey[];
}

const STORAGE_KEY = "thesis:v1";
const empty: State = { workspace: null, portals: [], sections: [], docs: [], accessKeys: [] };

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(empty);
    return { ...structuredClone(empty), ...JSON.parse(raw) };
  } catch {
    return structuredClone(empty);
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const getSnapshot = () => state;

/** Reactive selector hook. */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

const now = () => new Date().toISOString();

// ---- Workspace ----------------------------------------------------------
export function ensureWorkspace(name = "My workspace"): Workspace {
  if (state.workspace) return state.workspace;
  const ws: Workspace = { id: uid(), name, slug: slugify(name), createdAt: now() };
  commit({ ...state, workspace: ws });
  return ws;
}
export function renameWorkspace(name: string) {
  if (!state.workspace) return;
  commit({ ...state, workspace: { ...state.workspace, name, slug: slugify(name) } });
}

// ---- Portals ------------------------------------------------------------
export function createPortal(name: string, accessPolicy: AccessPolicy = "public"): Portal {
  ensureWorkspace();
  const slug = uniqueSlug(slugify(name), state.portals.map((p) => p.slug));
  const portal: Portal = {
    id: uid(),
    key: portalKey(),
    name,
    slug,
    accessPolicy,
    domains: [],
    createdAt: now(),
  };
  commit({ ...state, portals: [...state.portals, portal] });
  return portal;
}
export function updatePortal(id: string, patch: Partial<Pick<Portal, "name" | "accessPolicy">>) {
  commit({
    ...state,
    portals: state.portals.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  });
}
export function deletePortal(id: string) {
  commit({
    ...state,
    portals: state.portals.filter((p) => p.id !== id),
    sections: state.sections.filter((s) => s.portalId !== id),
    docs: state.docs.filter((d) => d.portalId !== id),
    accessKeys: state.accessKeys.filter((k) => k.portalId !== id),
  });
}
export function addDomain(portalId: string, hostname: string) {
  const h = hostname.trim().toLowerCase();
  if (!h) return;
  commit({
    ...state,
    portals: state.portals.map((p) =>
      p.id === portalId && !p.domains.includes(h) ? { ...p, domains: [...p.domains, h] } : p,
    ),
  });
}
export function removeDomain(portalId: string, hostname: string) {
  commit({
    ...state,
    portals: state.portals.map((p) =>
      p.id === portalId ? { ...p, domains: p.domains.filter((d) => d !== hostname) } : p,
    ),
  });
}

// ---- Sections -----------------------------------------------------------
export function createSection(portalId: string, name: string): Section {
  const section: Section = {
    id: uid(),
    portalId,
    name,
    position: state.sections.filter((s) => s.portalId === portalId).length,
  };
  commit({ ...state, sections: [...state.sections, section] });
  return section;
}

// ---- Docs ---------------------------------------------------------------
const STARTER = (title: string) =>
  `# ${title}\n\nStart writing — or point your agent at this portal and let it draft.\n\n:::callout{type=info}\nThis is a callout. Try \`:::video{src="..."}\` for rich media.\n:::\n`;

export function createDoc(portalId: string, title: string, sectionId: string | null = null): Doc {
  const portalDocs = state.docs.filter((d) => d.portalId === portalId);
  const slug = uniqueSlug(slugify(title), portalDocs.map((d) => d.slug));
  const doc: Doc = {
    id: uid(),
    key: docKey(),
    portalId,
    sectionId,
    title,
    slug,
    draft: STARTER(title),
    published: null,
    publishedAt: null,
    source: { type: "inline" },
    position: portalDocs.length,
    createdAt: now(),
    updatedAt: now(),
  };
  commit({ ...state, docs: [...state.docs, doc] });
  return doc;
}
export function updateDocDraft(id: string, draft: string) {
  commit({
    ...state,
    docs: state.docs.map((d) => (d.id === id ? { ...d, draft, updatedAt: now() } : d)),
  });
}
export function renameDoc(id: string, title: string) {
  commit({
    ...state,
    docs: state.docs.map((d) => (d.id === id ? { ...d, title, updatedAt: now() } : d)),
  });
}
export function publishDoc(id: string) {
  commit({
    ...state,
    docs: state.docs.map((d) =>
      d.id === id ? { ...d, published: d.draft, publishedAt: now() } : d,
    ),
  });
}
export function deleteDoc(id: string) {
  commit({ ...state, docs: state.docs.filter((d) => d.id !== id) });
}
export function reorderDocs(portalId: string, orderedIds: string[]) {
  const pos = new Map(orderedIds.map((id, i) => [id, i]));
  commit({
    ...state,
    docs: state.docs.map((d) =>
      d.portalId === portalId && pos.has(d.id) ? { ...d, position: pos.get(d.id)! } : d,
    ),
  });
}

// ---- Access keys --------------------------------------------------------
export function createAccessKey(portalId: string, label = ""): AccessKey {
  const key: AccessKey = {
    id: uid(),
    key: genAccessKey(),
    portalId,
    label,
    status: "active",
    createdAt: now(),
  };
  commit({ ...state, accessKeys: [...state.accessKeys, key] });
  return key;
}
export function revokeAccessKey(id: string) {
  commit({
    ...state,
    accessKeys: state.accessKeys.map((k) =>
      k.id === id ? { ...k, status: "revoked" as const } : k,
    ),
  });
}

// ---- Resolvers (pure reads) --------------------------------------------
export const selectPortals = (s: State) => s.portals;
export const portalBySlug = (s: State, slug: string) => s.portals.find((p) => p.slug === slug);
export const portalByDomain = (s: State, host: string) =>
  s.portals.find((p) => p.domains.includes(host.toLowerCase()));
export const docsOfPortal = (s: State, portalId: string) =>
  s.docs.filter((d) => d.portalId === portalId).sort((a, b) => a.position - b.position);
export const docBySlug = (s: State, portalId: string, slug: string) =>
  s.docs.find((d) => d.portalId === portalId && d.slug === slug);
export const sectionsOfPortal = (s: State, portalId: string) =>
  s.sections.filter((x) => x.portalId === portalId).sort((a, b) => a.position - b.position);
export const keysOfPortal = (s: State, portalId: string) =>
  s.accessKeys.filter((k) => k.portalId === portalId);

function uniqueSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let i = 2;
  while (taken.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
