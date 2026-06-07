#!/usr/bin/env node
/**
 * Thesis MCP server.
 *
 * Lets an AI agent (Claude, Codex, ...) author and publish documentation
 * portals as markdown files in a local, git-friendly content workspace. The
 * server is fully standalone — it operates on a directory of markdown plus a
 * `thesis.json` manifest and depends on no cloud backend.
 *
 * Content directory: env `THESIS_CONTENT_DIR` (default `./thesis-content`).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { ContentStore, RefError, type RefCandidate } from "./store.js";
import { REGISTRY } from "./registry.js";
import type { Doc, Manifest, Portal } from "./manifest.js";

const CONTENT_DIR = process.env.THESIS_CONTENT_DIR ?? "./thesis-content";
const store = new ContentStore(CONTENT_DIR);

// --- response helpers ------------------------------------------------------

function text(body: string) {
  return { content: [{ type: "text" as const, text: body }] };
}

function jsonText(value: unknown) {
  return text(JSON.stringify(value, null, 2));
}

function errorText(message: string, extra?: Record<string, unknown>) {
  const payload = { error: message, ...extra };
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }], isError: true };
}

function candidatesPayload(candidates: RefCandidate[]) {
  return {
    candidates: candidates.map((c) => ({ ref: c.ref, portal: c.portal, title: c.title })),
  };
}

/** Wrap a handler so thrown errors become structured MCP error responses. */
function safe<A>(handler: (args: A) => Promise<ReturnType<typeof text>>) {
  return async (args: A) => {
    try {
      return await handler(args);
    } catch (err) {
      if (err instanceof RefError) {
        return errorText(err.message, candidatesPayload(err.candidates));
      }
      return errorText(err instanceof Error ? err.message : String(err));
    }
  };
}

// --- views -----------------------------------------------------------------

function portalView(p: Portal) {
  return {
    key: p.key,
    name: p.name,
    slug: p.slug,
    accessPolicy: p.accessPolicy,
    docCount: p.docs.length,
  };
}

function docListView(d: Doc) {
  return {
    key: d.key,
    title: d.title,
    slug: d.slug,
    section: d.section,
    order: d.order,
    published: d.published,
  };
}

function sortedDocs(p: Portal): Doc[] {
  return [...p.docs].sort((a, b) => a.order - b.order);
}

function requirePortal(manifest: Manifest, ref: string): Portal {
  const portal = store.findPortal(manifest, ref);
  if (!portal) {
    throw new RefError(
      `No portal matches "${ref}".`,
      manifest.portals.map((p) => ({ ref: p.slug, portal: p.slug, title: p.name })),
    );
  }
  return portal;
}

// --- server ----------------------------------------------------------------

const server = new McpServer({
  name: "thesis",
  version: "0.1.0",
});

server.registerTool(
  "list_portals",
  {
    title: "List portals",
    description:
      "List all documentation portals in the workspace (key, name, slug, accessPolicy, doc count).",
    inputSchema: {},
  },
  safe(async () => {
    const manifest = await store.loadManifest();
    return jsonText({
      workspace: manifest.workspace.name,
      portals: manifest.portals.map(portalView),
    });
  }),
);

server.registerTool(
  "list_docs",
  {
    title: "List docs",
    description: "List the docs in a portal. Accepts a portal key or slug.",
    inputSchema: {
      portal: z.string().describe("Portal key (prt_...) or slug."),
    },
  },
  safe(async ({ portal }: { portal: string }) => {
    const manifest = await store.loadManifest();
    const p = requirePortal(manifest, portal);
    return jsonText({
      portal: portalView(p),
      sections: [...p.sections].sort((a, b) => a.order - b.order),
      docs: sortedDocs(p).map(docListView),
    });
  }),
);

server.registerTool(
  "get_doc",
  {
    title: "Get doc",
    description:
      'Return a doc\'s markdown body and metadata. Ref is a doc key (doc_...) or "portal-slug/doc-slug". If ambiguous or not found, returns candidates instead of guessing.',
    inputSchema: {
      ref: z.string().describe('Doc key, or "portal-slug/doc-slug".'),
    },
  },
  safe(async ({ ref }: { ref: string }) => {
    const manifest = await store.loadManifest();
    const { portal, doc } = store.resolveDocRef(manifest, ref);
    const content = await store.readBody(doc);
    return jsonText({
      portal: { key: portal.key, slug: portal.slug, name: portal.name },
      doc: {
        ...docListView(doc),
        sourcePath: doc.sourcePath,
        publishedAt: doc.publishedAt ?? null,
      },
      content,
    });
  }),
);

server.registerTool(
  "create_portal",
  {
    title: "Create portal",
    description:
      "Create a new documentation portal. Returns its generated key and slug.",
    inputSchema: {
      name: z.string().min(1).describe("Display name for the portal."),
      accessPolicy: z
        .enum(["public", "gated"])
        .optional()
        .describe('Access policy: "public" (default) or "gated".'),
    },
  },
  safe(async ({ name, accessPolicy }: { name: string; accessPolicy?: "public" | "gated" }) => {
    const manifest = await store.loadManifest();
    const portal = store.createPortal(manifest, name, accessPolicy ?? "public");
    await store.saveManifest(manifest);
    return jsonText({ created: portalView(portal) });
  }),
);

server.registerTool(
  "create_doc",
  {
    title: "Create doc",
    description:
      "Create a doc in a portal, generate its key and slug, write the markdown file, and add it to the manifest.",
    inputSchema: {
      portal: z.string().describe("Portal key or slug."),
      title: z.string().min(1).describe("Doc title."),
      section: z
        .string()
        .optional()
        .describe("Section name to group the doc under (created if new)."),
      content: z
        .string()
        .optional()
        .describe("Initial markdown body. Defaults to a title heading."),
    },
  },
  safe(
    async ({
      portal,
      title,
      section,
      content,
    }: {
      portal: string;
      title: string;
      section?: string;
      content?: string;
    }) => {
      const manifest = await store.loadManifest();
      const p = requirePortal(manifest, portal);
      const doc = store.createDoc(p, title, section ?? "");
      const body = content ?? `# ${title}\n`;
      await store.writeBody(doc, body);
      await store.saveManifest(manifest);
      return jsonText({
        created: {
          ...docListView(doc),
          sourcePath: doc.sourcePath,
          ref: `${p.slug}/${doc.slug}`,
        },
      });
    },
  ),
);

server.registerTool(
  "update_doc",
  {
    title: "Update doc",
    description:
      "Overwrite a doc's markdown body. Marks the doc as having unpublished changes.",
    inputSchema: {
      ref: z.string().describe('Doc key, or "portal-slug/doc-slug".'),
      content: z.string().describe("New full markdown body."),
    },
  },
  safe(async ({ ref, content }: { ref: string; content: string }) => {
    const manifest = await store.loadManifest();
    const { portal, doc } = store.resolveDocRef(manifest, ref);
    await store.writeBody(doc, content);
    // Editing creates a delta versus the published snapshot.
    doc.published = false;
    await store.saveManifest(manifest);
    return jsonText({
      updated: { ...docListView(doc), ref: `${portal.slug}/${doc.slug}` },
      bytes: Buffer.byteLength(content, "utf8"),
    });
  }),
);

server.registerTool(
  "set_structure",
  {
    title: "Set structure",
    description:
      "Reorder and/or move docs within a portal. Provide docs in the desired order; each item may set a section. Docs not listed keep their relative order after the listed ones.",
    inputSchema: {
      portal: z.string().describe("Portal key or slug."),
      order: z
        .array(
          z.union([
            z.string(),
            z.object({
              ref: z.string().describe("Doc key or slug within this portal."),
              section: z
                .string()
                .optional()
                .describe("Section to move this doc into."),
            }),
          ]),
        )
        .describe("Doc refs (key or slug) in the desired order."),
    },
  },
  safe(
    async ({
      portal,
      order,
    }: {
      portal: string;
      order: (string | { ref: string; section?: string })[];
    }) => {
      const manifest = await store.loadManifest();
      const p = requirePortal(manifest, portal);

      const byRef = new Map<string, Doc>();
      for (const d of p.docs) {
        byRef.set(d.key, d);
        byRef.set(d.slug, d);
      }

      const seen = new Set<string>();
      let nextOrder = 0;
      const unknown: string[] = [];

      for (const item of order) {
        const refStr = typeof item === "string" ? item : item.ref;
        const section = typeof item === "string" ? undefined : item.section;
        const doc = byRef.get(refStr);
        if (!doc) {
          unknown.push(refStr);
          continue;
        }
        if (seen.has(doc.key)) continue;
        seen.add(doc.key);
        doc.order = nextOrder++;
        if (section !== undefined) {
          if (section) store.ensureSection(p, section);
          doc.section = section;
        }
      }

      if (unknown.length > 0) {
        throw new RefError(
          `These refs are not docs in portal "${p.slug}": ${unknown.join(", ")}`,
          p.docs.map((d) => ({ ref: d.slug, portal: p.slug, title: d.title })),
        );
      }

      // Append any docs that weren't listed, preserving their prior order.
      const remaining = p.docs
        .filter((d) => !seen.has(d.key))
        .sort((a, b) => a.order - b.order);
      for (const doc of remaining) doc.order = nextOrder++;

      // Re-sequence sections by current appearance order of their docs.
      reorderSections(p);

      await store.saveManifest(manifest);
      return jsonText({
        portal: portalView(p),
        sections: [...p.sections].sort((a, b) => a.order - b.order),
        docs: sortedDocs(p).map(docListView),
      });
    },
  ),
);

server.registerTool(
  "publish",
  {
    title: "Publish",
    description:
      "Freeze a published snapshot from the current markdown. Pass a doc ref to publish one doc, or a portal key/slug to publish every doc in the portal.",
    inputSchema: {
      ref: z
        .string()
        .optional()
        .describe('Doc key or "portal-slug/doc-slug".'),
      portal: z
        .string()
        .optional()
        .describe("Portal key or slug — publishes all its docs."),
    },
  },
  safe(async ({ ref, portal }: { ref?: string; portal?: string }) => {
    if (!ref && !portal) {
      throw new Error("Provide either `ref` (one doc) or `portal` (all docs).");
    }
    const manifest = await store.loadManifest();
    const now = new Date().toISOString();
    const published: { ref: string; snapshot: string }[] = [];

    const publishOne = async (p: Portal, d: Doc) => {
      const body = await store.readBody(d);
      const snapshot = await store.writePublished(p, d, body);
      d.published = true;
      d.publishedAt = now;
      published.push({ ref: `${p.slug}/${d.slug}`, snapshot });
    };

    if (portal) {
      const p = requirePortal(manifest, portal);
      for (const d of sortedDocs(p)) await publishOne(p, d);
    } else {
      const { portal: p, doc } = store.resolveDocRef(manifest, ref!);
      await publishOne(p, doc);
    }

    await store.saveManifest(manifest);
    return jsonText({ publishedAt: now, count: published.length, published });
  }),
);

server.registerTool(
  "get_registry",
  {
    title: "Get component registry",
    description:
      "List the rich markdown directive components available to authors (name, syntax, description, attributes), so the agent knows what it can place in a doc.",
    inputSchema: {},
  },
  safe(async () => {
    return jsonText({
      directives: REGISTRY.map((c) => ({
        name: c.name,
        syntax: c.syntax,
        description: c.description,
        attributes: c.attributes,
      })),
      note: "Directives render to rich components in the Thesis portal and degrade to plain text elsewhere.",
    });
  }),
);

// --- helpers ---------------------------------------------------------------

function reorderSections(p: Portal): void {
  const firstSeen = new Map<string, number>();
  let i = 0;
  for (const d of sortedDocs(p)) {
    if (d.section && !firstSeen.has(d.section)) firstSeen.set(d.section, i++);
  }
  for (const s of p.sections) {
    const seen = firstSeen.get(s.name);
    if (seen !== undefined) s.order = seen;
  }
  // Sections with no docs keep a stable order after the populated ones.
  let tail = firstSeen.size;
  for (const s of p.sections) {
    if (!firstSeen.has(s.name)) s.order = tail++;
  }
}

// --- bootstrap -------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stderr is safe for logs; stdout is the MCP transport.
  console.error(
    `Thesis MCP server running on stdio. Content dir: ${store.root}`,
  );
}

main().catch((err) => {
  console.error("Fatal error starting Thesis MCP server:", err);
  process.exit(1);
});
