# @thesis/mcp

The **Thesis MCP server** is how your AI agent (Claude, Codex, or any
MCP-capable client) authors and publishes documentation portals.

Thesis is docs-as-code: your content is **markdown files in a git-friendly
directory**, indexed by a single `thesis.json` manifest. This server is fully
**standalone** — it operates entirely on a local content workspace and depends
on no cloud backend. Your agent drafts the words; this MCP gives it the verbs to
organize, structure, and publish them.

## What it does

The server exposes a small set of tools over stdio:

| Tool | What it does |
|---|---|
| `list_portals` | List portals (key, name, slug, access policy, doc count). |
| `list_docs` | List docs in a portal (key, title, slug, section, published). |
| `get_doc` | Return a doc's markdown body + metadata. Returns candidates when a ref is ambiguous. |
| `create_portal` | Create a portal; returns its generated key and slug. |
| `create_doc` | Create a doc (generates key + slug), write its markdown file, add to the manifest. |
| `update_doc` | Overwrite a doc's markdown body. |
| `set_structure` | Reorder / move docs and sections within a portal. |
| `publish` | Freeze a published snapshot of a doc or a whole portal. |
| `get_registry` | List the rich markdown directive components an author can place. |

## Content model

Everything lives under the content directory (`THESIS_CONTENT_DIR`):

```
thesis-content/
  thesis.json                          # manifest (workspaces -> portals -> docs)
  portals/<portal-slug>/<doc-slug>.md  # editable source bodies
  published/<portal-slug>/<doc-slug>.md# frozen published snapshots
```

The manifest shape:

```jsonc
{
  "workspace": { "name": "Thesis Workspace" },
  "portals": [
    {
      "key": "prt_9c2de",
      "name": "Product Docs",
      "slug": "product-docs",
      "accessPolicy": "public",          // or "gated"
      "sections": [{ "name": "Guides", "order": 0 }],
      "docs": [
        {
          "key": "doc_3f8a1",
          "title": "Getting Started",
          "slug": "getting-started",
          "section": "Guides",
          "order": 0,
          "sourcePath": "portals/product-docs/getting-started.md",
          "published": true,
          "publishedAt": "2026-06-07T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

### Referencing docs

`get_doc`, `update_doc`, and `publish` take a `ref` that is either:

- a **doc key** — `doc_3f8a1`, or
- a **path** — `product-docs/getting-started` (`portal-slug/doc-slug`).

If a ref is ambiguous or missing, the tool returns a list of candidate refs
instead of guessing.

## Rich directives

`get_registry` returns the bounded set of directive components an author may
place. They render to rich components in the Thesis portal and degrade to plain
text everywhere else:

- `:::video{src="…"}` — inline video player.
- `:::callout{type="info|tip|warning|danger"}` … `:::` — highlighted callout.
- `:::diagram` … `:::` — diagram (e.g. Mermaid) from the block body.
- `:::embed{url="…"}` — embed external content by URL.

## Install & build

```bash
npm install
npm run build      # tsc -> dist/
npm start          # node dist/index.js
```

## Configure

The only configuration is the content directory:

| Env var | Default | Purpose |
|---|---|---|
| `THESIS_CONTENT_DIR` | `./thesis-content` | Root of the markdown + manifest workspace. |

The directory and an empty `thesis.json` are created automatically on first use.

## Add to your MCP client

### Claude Code

```bash
claude mcp add thesis \
  --env THESIS_CONTENT_DIR=/absolute/path/to/your/thesis-content \
  -- node /absolute/path/to/thesis/mcp/dist/index.js
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```jsonc
{
  "mcpServers": {
    "thesis": {
      "command": "node",
      "args": ["/absolute/path/to/thesis/mcp/dist/index.js"],
      "env": {
        "THESIS_CONTENT_DIR": "/absolute/path/to/your/thesis-content"
      }
    }
  }
}
```

Once installed globally (`npm i -g`), the published `thesis-mcp` bin can be used
in place of `node …/dist/index.js`.

## License

MIT
