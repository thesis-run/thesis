/**
 * Thesis data layer — Supabase-backed.
 *
 * Components read a synchronous in-memory cache via `useStore(selector)`; mutations
 * update the cache optimistically and write through to Supabase. `hydrate()` loads the
 * signed-in user's workspace. This is the single seam the whole app talks to.
 */
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";
import { supabase } from "@/integrations/supabase/client";
import { portalKey, docKey, accessKey as genAccessKey, uid, slugify } from "./ids";

export type AccessPolicy = "public" | "gated";
export type SourceType = "inline" | "gist" | "github" | "upload";

export interface Workspace { id: string; name: string; slug: string; createdAt: string }
export interface Portal {
  id: string; key: string; name: string; slug: string;
  accessPolicy: AccessPolicy; domains: string[]; createdAt: string;
}
export interface Section { id: string; portalId: string; name: string; position: number }
export interface Doc {
  id: string; key: string; portalId: string; sectionId: string | null;
  title: string; slug: string; draft: string;
  published: string | null; publishedAt: string | null;
  source: { type: SourceType; ref?: string };
  position: number; createdAt: string; updatedAt: string;
}
export interface AccessKey {
  id: string; key: string; portalId: string; label: string;
  status: "active" | "revoked"; createdAt: string;
}

interface State {
  workspace: Workspace | null;
  portals: Portal[];
  sections: Section[];
  docs: Doc[];
  accessKeys: AccessKey[];
  ready: boolean;
}

const empty: State = { workspace: null, portals: [], sections: [], docs: [], accessKeys: [], ready: false };
let state: State = empty;
const listeners = new Set<() => void>();

function commit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => state;

function eq<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  return false;
}
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, eq);
}

const now = () => new Date().toISOString();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fail = (label: string) => (r: { error: any }) => { if (r.error) console.error(`[thesis] ${label}`, r.error.message); return r; };

// ---- Hydrate ------------------------------------------------------------
export async function hydrate(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) { commit({ ...empty, ready: true }); return; }

  let ws = (await supabase.from("workspaces").select("*").limit(1).maybeSingle()).data;
  if (!ws) {
    const name = `${user.email?.split("@")[0] ?? "My"} workspace`;
    const id = uid();
    await supabase.from("workspaces").insert({ id, name, slug: slugify(name), owner_id: user.id }).then(fail("create ws"));
    await supabase.from("members").insert({ workspace_id: id, user_id: user.id, role: "owner" }).then(fail("create member"));
    ws = { id, name, slug: slugify(name), created_at: now() };
  }

  const [portals, domains, sections, docs, snaps, keys] = await Promise.all([
    supabase.from("portals").select("*"),
    supabase.from("domains").select("*"),
    supabase.from("sections").select("*"),
    supabase.from("docs").select("*"),
    supabase.from("doc_snapshots").select("*").order("published_at", { ascending: false }),
    supabase.from("access_keys").select("*"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestSnap = new Map<string, any>();
  (snaps.data ?? []).forEach((s) => { if (!latestSnap.has(s.doc_id)) latestSnap.set(s.doc_id, s); });
  const domByPortal = new Map<string, string[]>();
  (domains.data ?? []).forEach((d) => domByPortal.set(d.portal_id, [...(domByPortal.get(d.portal_id) ?? []), d.hostname]));

  commit({
    ready: true,
    workspace: { id: ws.id, name: ws.name, slug: ws.slug, createdAt: ws.created_at },
    portals: (portals.data ?? []).map((p) => ({
      id: p.id, key: p.key, name: p.name, slug: p.slug,
      accessPolicy: p.access_policy, domains: domByPortal.get(p.id) ?? [], createdAt: p.created_at,
    })),
    sections: (sections.data ?? []).map((s) => ({ id: s.id, portalId: s.portal_id, name: s.name, position: s.position })),
    docs: (docs.data ?? []).map((d) => {
      const snap = latestSnap.get(d.id);
      return {
        id: d.id, key: d.key, portalId: d.portal_id, sectionId: d.section_id,
        title: d.title, slug: d.slug, draft: d.draft_md,
        published: snap?.md ?? null, publishedAt: snap?.published_at ?? null,
        source: d.source ?? { type: "inline" }, position: d.position,
        createdAt: d.created_at, updatedAt: d.updated_at,
      };
    }),
    accessKeys: (keys.data ?? []).map((k) => ({
      id: k.id, key: k.key, portalId: k.portal_id, label: k.label ?? "", status: k.status, createdAt: k.created_at,
    })),
  });
}

/** Load a single public portal by hostname/slug for anon visitors (no workspace). */
export async function hydratePublic(opts: { slug?: string; host?: string }): Promise<Portal | null> {
  let q = supabase.from("portals").select("*").eq("access_policy", "public");
  const { data } = await q;
  const portal = (data ?? []).find((p) =>
    opts.slug ? p.slug === opts.slug : false,
  );
  if (!portal) return null;
  const [sections, docs, snaps] = await Promise.all([
    supabase.from("sections").select("*").eq("portal_id", portal.id),
    supabase.from("docs").select("*").eq("portal_id", portal.id),
    supabase.from("doc_snapshots").select("*").eq("portal_id", portal.id).order("published_at", { ascending: false }),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latest = new Map<string, any>();
  (snaps.data ?? []).forEach((s) => { if (!latest.has(s.doc_id)) latest.set(s.doc_id, s); });
  commit({
    ...empty, ready: true,
    portals: [{ id: portal.id, key: portal.key, name: portal.name, slug: portal.slug, accessPolicy: portal.access_policy, domains: [], createdAt: portal.created_at }],
    sections: (sections.data ?? []).map((s) => ({ id: s.id, portalId: s.portal_id, name: s.name, position: s.position })),
    docs: (docs.data ?? []).map((d) => {
      const s = latest.get(d.id);
      return { id: d.id, key: d.key, portalId: d.portal_id, sectionId: d.section_id, title: d.title, slug: d.slug, draft: d.draft_md, published: s?.md ?? null, publishedAt: s?.published_at ?? null, source: d.source ?? { type: "inline" }, position: d.position, createdAt: d.created_at, updatedAt: d.updated_at };
    }),
  });
  return state.portals[0];
}

export function resetStore() { commit(empty); }

// ---- Workspace ----------------------------------------------------------
export function renameWorkspace(name: string) {
  if (!state.workspace) return;
  const w = { ...state.workspace, name, slug: slugify(name) };
  commit({ ...state, workspace: w });
  supabase.from("workspaces").update({ name: w.name, slug: w.slug }).eq("id", w.id).then(fail("rename ws"));
}

// ---- Portals ------------------------------------------------------------
export function createPortal(name: string, accessPolicy: AccessPolicy = "public"): Portal {
  const slug = uniqueSlug(slugify(name), state.portals.map((p) => p.slug));
  const portal: Portal = { id: uid(), key: portalKey(), name, slug, accessPolicy, domains: [], createdAt: now() };
  commit({ ...state, portals: [...state.portals, portal] });
  supabase.from("portals").insert({
    id: portal.id, key: portal.key, workspace_id: state.workspace?.id, name, slug, access_policy: accessPolicy,
  }).then(fail("create portal"));
  return portal;
}
export function updatePortal(id: string, patch: Partial<Pick<Portal, "name" | "accessPolicy">>) {
  commit({ ...state, portals: state.portals.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const dbPatch: Record<string, unknown> = {};
  if (patch.name) { dbPatch.name = patch.name; dbPatch.slug = slugify(patch.name); }
  if (patch.accessPolicy) dbPatch.access_policy = patch.accessPolicy;
  supabase.from("portals").update(dbPatch).eq("id", id).then(fail("update portal"));
}
export function deletePortal(id: string) {
  commit({
    ...state,
    portals: state.portals.filter((p) => p.id !== id),
    sections: state.sections.filter((s) => s.portalId !== id),
    docs: state.docs.filter((d) => d.portalId !== id),
    accessKeys: state.accessKeys.filter((k) => k.portalId !== id),
  });
  supabase.from("portals").delete().eq("id", id).then(fail("delete portal"));
}
export function addDomain(portalId: string, hostname: string) {
  const h = hostname.trim().toLowerCase();
  if (!h) return;
  commit({ ...state, portals: state.portals.map((p) => (p.id === portalId && !p.domains.includes(h) ? { ...p, domains: [...p.domains, h] } : p)) });
  supabase.from("domains").insert({ portal_id: portalId, hostname: h }).then(fail("add domain"));
}
export function removeDomain(portalId: string, hostname: string) {
  commit({ ...state, portals: state.portals.map((p) => (p.id === portalId ? { ...p, domains: p.domains.filter((d) => d !== hostname) } : p)) });
  supabase.from("domains").delete().eq("portal_id", portalId).eq("hostname", hostname).then(fail("remove domain"));
}

// ---- Sections -----------------------------------------------------------
export function createSection(portalId: string, name: string): Section {
  const section: Section = { id: uid(), portalId, name, position: state.sections.filter((s) => s.portalId === portalId).length };
  commit({ ...state, sections: [...state.sections, section] });
  supabase.from("sections").insert({ id: section.id, portal_id: portalId, name, position: section.position }).then(fail("create section"));
  return section;
}

// ---- Docs ---------------------------------------------------------------
const STARTER = (title: string) =>
  `# ${title}\n\nStart writing — or point your agent at this portal and let it draft.\n\n:::callout{type=info}\nThis is a callout. Try \`:::video{src="..."}\` for rich media.\n:::\n`;

export function createDoc(portalId: string, title: string, sectionId: string | null = null): Doc {
  const portalDocs = state.docs.filter((d) => d.portalId === portalId);
  const slug = uniqueSlug(slugify(title), portalDocs.map((d) => d.slug));
  const doc: Doc = {
    id: uid(), key: docKey(), portalId, sectionId, title, slug, draft: STARTER(title),
    published: null, publishedAt: null, source: { type: "inline" }, position: portalDocs.length,
    createdAt: now(), updatedAt: now(),
  };
  commit({ ...state, docs: [...state.docs, doc] });
  supabase.from("docs").insert({
    id: doc.id, key: doc.key, workspace_id: state.workspace?.id, portal_id: portalId,
    section_id: sectionId, title, slug, draft_md: doc.draft, source: doc.source, position: doc.position,
  }).then(fail("create doc"));
  return doc;
}
export function updateDocDraft(id: string, draft: string) {
  commit({ ...state, docs: state.docs.map((d) => (d.id === id ? { ...d, draft, updatedAt: now() } : d)) });
  supabase.from("docs").update({ draft_md: draft, updated_at: now() }).eq("id", id).then(fail("update doc"));
}
export function renameDoc(id: string, title: string) {
  commit({ ...state, docs: state.docs.map((d) => (d.id === id ? { ...d, title } : d)) });
  supabase.from("docs").update({ title }).eq("id", id).then(fail("rename doc"));
}
export function publishDoc(id: string) {
  const doc = state.docs.find((d) => d.id === id);
  if (!doc) return;
  const at = now();
  commit({ ...state, docs: state.docs.map((d) => (d.id === id ? { ...d, published: d.draft, publishedAt: at } : d)) });
  supabase.from("doc_snapshots").insert({ doc_id: id, portal_id: doc.portalId, md: doc.draft, published_at: at }).then(fail("publish"));
}
export function deleteDoc(id: string) {
  commit({ ...state, docs: state.docs.filter((d) => d.id !== id) });
  supabase.from("docs").delete().eq("id", id).then(fail("delete doc"));
}
export function reorderDocs(portalId: string, orderedIds: string[]) {
  const pos = new Map(orderedIds.map((id, i) => [id, i]));
  commit({ ...state, docs: state.docs.map((d) => (d.portalId === portalId && pos.has(d.id) ? { ...d, position: pos.get(d.id)! } : d)) });
  orderedIds.forEach((id, i) => supabase.from("docs").update({ position: i }).eq("id", id).then(fail("reorder")));
}

// ---- Access keys --------------------------------------------------------
export function createAccessKey(portalId: string, label = ""): AccessKey {
  const key: AccessKey = { id: uid(), key: genAccessKey(), portalId, label, status: "active", createdAt: now() };
  commit({ ...state, accessKeys: [...state.accessKeys, key] });
  supabase.from("access_keys").insert({ id: key.id, key: key.key, portal_id: portalId, label }).then(fail("create key"));
  return key;
}
export function revokeAccessKey(id: string) {
  commit({ ...state, accessKeys: state.accessKeys.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k)) });
  supabase.from("access_keys").update({ status: "revoked" }).eq("id", id).then(fail("revoke key"));
}

// ---- Selectors (pure reads) --------------------------------------------
export const selectPortals = (s: State) => s.portals;
export const portalBySlug = (s: State, slug: string) => s.portals.find((p) => p.slug === slug);
export const portalByDomain = (s: State, host: string) => s.portals.find((p) => p.domains.includes(host.toLowerCase()));
export const docsOfPortal = (s: State, portalId: string) => s.docs.filter((d) => d.portalId === portalId).sort((a, b) => a.position - b.position);
export const docBySlug = (s: State, portalId: string, slug: string) => s.docs.find((d) => d.portalId === portalId && d.slug === slug);
export const sectionsOfPortal = (s: State, portalId: string) => s.sections.filter((x) => x.portalId === portalId).sort((a, b) => a.position - b.position);
export const keysOfPortal = (s: State, portalId: string) => s.accessKeys.filter((k) => k.portalId === portalId);

function uniqueSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let i = 2;
  while (taken.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
