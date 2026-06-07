/**
 * Manifest types and helpers for the Thesis content workspace.
 *
 * The manifest (`thesis.json`) is the single index of everything in a content
 * workspace: its portals, their sections, and the docs inside them. Markdown
 * bodies live in their own files on disk; the manifest only holds metadata and
 * the relative `sourcePath` pointer to each body.
 */

export type AccessPolicy = "public" | "gated";

export interface Section {
  /** Human-readable section name (also used to group docs). */
  name: string;
  /** Sort order within the portal. Lower comes first. */
  order: number;
}

export interface Doc {
  /** Stable key, e.g. `doc_3f8a1`. */
  key: string;
  /** Display title. */
  title: string;
  /** URL-safe slug, unique within its portal. */
  slug: string;
  /** Section name this doc belongs to (matches a Section.name, or ""). */
  section: string;
  /** Sort order within the portal. Lower comes first. */
  order: number;
  /** Workspace-relative path to the markdown body. */
  sourcePath: string;
  /** Whether a published snapshot exists and is current. */
  published: boolean;
  /** ISO timestamp of the last publish, if any. */
  publishedAt?: string;
}

export interface Portal {
  /** Stable key, e.g. `prt_9c2de`. */
  key: string;
  /** Display name. */
  name: string;
  /** URL-safe slug, unique within the workspace. */
  slug: string;
  /** Access policy for the published portal. */
  accessPolicy: AccessPolicy;
  /** Ordered sections. */
  sections: Section[];
  /** Docs in this portal. */
  docs: Doc[];
}

export interface Workspace {
  name: string;
}

export interface Manifest {
  workspace: Workspace;
  portals: Portal[];
}

/** A fresh, empty manifest for a new content workspace. */
export function emptyManifest(name = "Thesis Workspace"): Manifest {
  return { workspace: { name }, portals: [] };
}

/**
 * Validate and normalize a parsed manifest object. Throws on structurally
 * invalid input so a corrupt file fails loudly instead of silently losing data.
 */
export function normalizeManifest(input: unknown): Manifest {
  if (!input || typeof input !== "object") {
    throw new Error("thesis.json is not a JSON object");
  }
  const obj = input as Record<string, unknown>;
  const workspace = obj.workspace as Record<string, unknown> | undefined;
  const name =
    workspace && typeof workspace.name === "string"
      ? workspace.name
      : "Thesis Workspace";

  const portalsIn = Array.isArray(obj.portals) ? obj.portals : [];
  const portals: Portal[] = portalsIn.map((p) => normalizePortal(p));

  return { workspace: { name }, portals };
}

function normalizePortal(input: unknown): Portal {
  if (!input || typeof input !== "object") {
    throw new Error("portal entry is not an object");
  }
  const p = input as Record<string, unknown>;
  const accessPolicy: AccessPolicy =
    p.accessPolicy === "gated" ? "gated" : "public";

  const sectionsIn = Array.isArray(p.sections) ? p.sections : [];
  const sections: Section[] = sectionsIn.map((s, i) => {
    const so = (s ?? {}) as Record<string, unknown>;
    return {
      name: typeof so.name === "string" ? so.name : "",
      order: typeof so.order === "number" ? so.order : i,
    };
  });

  const docsIn = Array.isArray(p.docs) ? p.docs : [];
  const docs: Doc[] = docsIn.map((d, i) => {
    const dobj = (d ?? {}) as Record<string, unknown>;
    return {
      key: requireString(dobj.key, "doc.key"),
      title: typeof dobj.title === "string" ? dobj.title : "Untitled",
      slug: requireString(dobj.slug, "doc.slug"),
      section: typeof dobj.section === "string" ? dobj.section : "",
      order: typeof dobj.order === "number" ? dobj.order : i,
      sourcePath: requireString(dobj.sourcePath, "doc.sourcePath"),
      published: dobj.published === true,
      publishedAt:
        typeof dobj.publishedAt === "string" ? dobj.publishedAt : undefined,
    };
  });

  return {
    key: requireString(p.key, "portal.key"),
    name: typeof p.name === "string" ? p.name : "Untitled Portal",
    slug: requireString(p.slug, "portal.slug"),
    accessPolicy,
    sections,
    docs,
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`thesis.json: missing or invalid \`${field}\``);
  }
  return value;
}
