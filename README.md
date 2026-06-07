# Thesis

The structure, access, and hosting layer for documentation an AI agent writes.

Bring your own agent (via the Thesis MCP) — it drafts the docs. Thesis organizes them, gates access, renders them richly (markdown + media), and publishes them to your own domain as a documentation portal.

> **Status:** early development.
> Plan & decisions: [`THESIS.md`](./THESIS.md) (source of truth) · long-range technical north star: [`SUBSTRATE.md`](./SUBSTRATE.md) · market landscape: [`COMPETITIVE_AUDIT.md`](./COMPETITIVE_AUDIT.md).

## Concepts

`Workspace → Portal → Section → Doc`. Content lives as portable markdown + media in git; Thesis adds structure, rich rendering, access keys, custom domains, and published snapshots. See `THESIS.md`.

## Stack

Vite · React · TypeScript · Tailwind · shadcn/ui · Supabase.

## Develop

```sh
bun install
bun run dev
```

Build:

```sh
bun run build
# On Apple Silicon where `node` is x64 (Rosetta), force bun's arm64 runtime:
bun --bun run build
```
