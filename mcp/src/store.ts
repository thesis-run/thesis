/**
 * ContentStore — all filesystem access for a Thesis content workspace.
 *
 * A workspace is a directory (THESIS_CONTENT_DIR) containing:
 *   thesis.json                          the manifest
 *   portals/<portal-slug>/<doc-slug>.md  doc source bodies
 *   published/<portal-slug>/<doc-slug>.md published snapshots
 *
 * Everything is plain files on disk so the workspace is git-friendly and has no
 * cloud dependency. All writes are atomic (write-temp-then-rename) and every
 * path is resolved through `resolveInside` to guard against path traversal.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";

import {
  emptyManifest,
  normalizeManifest,
  type Doc,
  type Manifest,
  type Portal,
} from "./manifest.js";
import { docKey, portalKey, slugify, uniqueSlug } from "./ids.js";

const MANIFEST_FILE = "thesis.json";

export interface ResolvedDoc {
  portal: Portal;
  doc: Doc;
}

export interface RefCandidate {
  ref: string;
  portal: string;
  title: string;
}

/** Thrown when a ref cannot be uniquely resolved. Carries candidate hints. */
export class RefError extends Error {
  candidates: RefCandidate[];
  constructor(message: string, candidates: RefCandidate[] = []) {
    super(message);
    this.name = "RefError";
    this.candidates = candidates;
  }
}

export class ContentStore {
  /** Absolute, resolved root of the content workspace. */
  readonly root: string;

  constructor(contentDir: string) {
    this.root = path.resolve(contentDir);
  }

  // --- path safety -------------------------------------------------------

  /**
   * Resolve a workspace-relative path and assert it stays inside the root.
   * Rejects absolute inputs and any `..` traversal that escapes the workspace.
   */
  resolveInside(...segments: string[]): string {
    const rel = path.join(...segments);
    if (path.isAbsolute(rel)) {
      throw new Error(`Path must be workspace-relative: ${rel}`);
    }
    const abs = path.resolve(this.root, rel);
    const prefix = this.root.endsWith(path.sep) ? this.root : this.root + path.sep;
    if (abs !== this.root && !abs.startsWith(prefix)) {
      throw new Error(`Path escapes the content workspace: ${rel}`);
    }
    return abs;
  }

  // --- low-level IO ------------------------------------------------------

  private async atomicWrite(absPath: string, data: string): Promise<void> {
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    const tmp = `${absPath}.${randomBytes(6).toString("hex")}.tmp`;
    await fs.writeFile(tmp, data, "utf8");
    await fs.rename(tmp, absPath);
  }

  // --- manifest ----------------------------------------------------------

  private manifestPath(): string {
    return this.resolveInside(MANIFEST_FILE);
  }

  /** Load the manifest, creating an empty one on first use. */
  async loadManifest(): Promise<Manifest> {
    const p = this.manifestPath();
    let raw: string;
    try {
      raw = await fs.readFile(p, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        const fresh = emptyManifest();
        await this.saveManifest(fresh);
        return fresh;
      }
      throw err;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`${MANIFEST_FILE} is not valid JSON`);
    }
    return normalizeManifest(parsed);
  }

  async saveManifest(manifest: Manifest): Promise<void> {
    await this.atomicWrite(
      this.manifestPath(),
      JSON.stringify(manifest, null, 2) + "\n",
    );
  }

  // --- doc bodies --------------------------------------------------------

  async readBody(doc: Doc): Promise<string> {
    const abs = this.resolveInside(doc.sourcePath);
    try {
      return await fs.readFile(abs, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return "";
      throw err;
    }
  }

  async writeBody(doc: Doc, content: string): Promise<void> {
    await this.atomicWrite(this.resolveInside(doc.sourcePath), content);
  }

  /** Copy the current source body into the published snapshot location. */
  async writePublished(portal: Portal, doc: Doc, content: string): Promise<string> {
    const rel = path.posix.join("published", portal.slug, `${doc.slug}.md`);
    await this.atomicWrite(this.resolveInside(rel), content);
    return rel;
  }

  // --- lookups -----------------------------------------------------------

  /** Find a portal by exact key or slug. */
  findPortal(manifest: Manifest, ref: string): Portal | undefined {
    return manifest.portals.find((p) => p.key === ref || p.slug === ref);
  }

  /**
   * Resolve a doc ref. Accepts a doc key (`doc_xxxx`) or a
   * `portal-slug/doc-slug` path. Throws a RefError with candidates when the
   * ref is ambiguous or not found, so callers never guess.
   */
  resolveDocRef(manifest: Manifest, ref: string): ResolvedDoc {
    const trimmed = ref.trim();

    // 1) Path form: portal-slug/doc-slug
    if (trimmed.includes("/")) {
      const [portalRef, docRef] = splitOnce(trimmed, "/");
      const portal = this.findPortal(manifest, portalRef);
      if (!portal) {
        throw new RefError(
          `No portal matches "${portalRef}".`,
          this.allDocCandidates(manifest),
        );
      }
      const doc = portal.docs.find(
        (d) => d.slug === docRef || d.key === docRef,
      );
      if (!doc) {
        throw new RefError(
          `No doc "${docRef}" in portal "${portal.slug}".`,
          this.portalDocCandidates(portal),
        );
      }
      return { portal, doc };
    }

    // 2) Doc key form: exact match across all portals.
    const keyMatches: ResolvedDoc[] = [];
    for (const portal of manifest.portals) {
      for (const doc of portal.docs) {
        if (doc.key === trimmed) keyMatches.push({ portal, doc });
      }
    }
    if (keyMatches.length === 1) return keyMatches[0]!;
    if (keyMatches.length > 1) {
      throw new RefError(
        `Ref "${trimmed}" is ambiguous across portals.`,
        keyMatches.map((m) => this.candidate(m.portal, m.doc)),
      );
    }

    // 3) Bare slug: only resolvable if unique across the whole workspace.
    const slugMatches: ResolvedDoc[] = [];
    for (const portal of manifest.portals) {
      for (const doc of portal.docs) {
        if (doc.slug === trimmed) slugMatches.push({ portal, doc });
      }
    }
    if (slugMatches.length === 1) return slugMatches[0]!;
    if (slugMatches.length > 1) {
      throw new RefError(
        `Slug "${trimmed}" exists in multiple portals; qualify it as "portal-slug/${trimmed}".`,
        slugMatches.map((m) => this.candidate(m.portal, m.doc)),
      );
    }

    throw new RefError(
      `No doc matches "${trimmed}". Use a doc key or "portal-slug/doc-slug".`,
      this.allDocCandidates(manifest),
    );
  }

  // --- mutations ---------------------------------------------------------

  createPortal(
    manifest: Manifest,
    name: string,
    accessPolicy: "public" | "gated",
  ): Portal {
    const slug = uniqueSlug(
      slugify(name),
      manifest.portals.map((p) => p.slug),
    );
    const portal: Portal = {
      key: portalKey(),
      name,
      slug,
      accessPolicy,
      sections: [],
      docs: [],
    };
    manifest.portals.push(portal);
    return portal;
  }

  /** Create a doc in `portal` and return it. Does not write the body. */
  createDoc(portal: Portal, title: string, section: string): Doc {
    const slug = uniqueSlug(
      slugify(title),
      portal.docs.map((d) => d.slug),
    );
    const order =
      portal.docs.reduce((max, d) => Math.max(max, d.order), -1) + 1;
    const sourcePath = path.posix.join("portals", portal.slug, `${slug}.md`);

    if (section) this.ensureSection(portal, section);

    const doc: Doc = {
      key: docKey(),
      title,
      slug,
      section: section || "",
      order,
      sourcePath,
      published: false,
    };
    portal.docs.push(doc);
    return doc;
  }

  /** Ensure a section with `name` exists on the portal; create at the end. */
  ensureSection(portal: Portal, name: string): void {
    if (!name) return;
    if (portal.sections.some((s) => s.name === name)) return;
    const order =
      portal.sections.reduce((max, s) => Math.max(max, s.order), -1) + 1;
    portal.sections.push({ name, order });
  }

  // --- candidate helpers -------------------------------------------------

  private candidate(portal: Portal, doc: Doc): RefCandidate {
    return {
      ref: `${portal.slug}/${doc.slug}`,
      portal: portal.slug,
      title: doc.title,
    };
  }

  private portalDocCandidates(portal: Portal): RefCandidate[] {
    return portal.docs.map((d) => this.candidate(portal, d));
  }

  private allDocCandidates(manifest: Manifest): RefCandidate[] {
    const out: RefCandidate[] = [];
    for (const portal of manifest.portals) {
      for (const doc of portal.docs) out.push(this.candidate(portal, doc));
    }
    return out;
  }
}

function splitOnce(value: string, sep: string): [string, string] {
  const i = value.indexOf(sep);
  if (i === -1) return [value, ""];
  return [value.slice(0, i), value.slice(i + sep.length)];
}
