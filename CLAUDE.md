# CLAUDE.md — Thesis

> Starter file. The repo is empty as of 2026-06-07 — this captures intent so the first commits inherit context. Update the placeholder sections as real code lands.

## What Thesis is

Thesis is an **open-core, AI-native documentation portal** — "docs for the AI age." Docs sites today serve two audiences: humans and AI agents. By end of 2025, AI agents accounted for 40%+ of docs readership on platforms that measure it (GitBook data). Thesis treats agents as a first-class audience, not an afterthought bolted onto a human-first CMS.

**Open-core** means: the engine (rendering, agent endpoints, MCP server, content pipeline) is open source and fully self-hostable; revenue comes from a hosted cloud and enterprise features (SSO, analytics at scale, managed AI).

## Positioning (one line)

The only docs platform that is both fully open/self-hostable AND AI-native by default. Today you must pick one: Mintlify/GitBook are AI-native but closed SaaS; Docusaurus/Read the Docs are open but have no native AI surface. Thesis closes that gap.

## Product principles

1. **Agents are readers.** Every page ships machine-readable by default: per-page `.md` endpoints, llms.txt/llms-full.txt, and an auto-generated MCP server. Zero config.
2. **MCP over llms.txt.** llms.txt has ~zero uptake from major crawlers (it's table stakes, not a moat). The real agent surface is MCP + clean markdown endpoints. Build accordingly.
3. **Solve drift, don't just host.** 60% of docs go stale within six months. Docs-as-code with CI hooks that detect drift against the codebase/OpenAPI spec is core, not an add-on.
4. **One source, two renderings.** Human-optimized (progressive disclosure, navigation) and agent-optimized (atomic, self-contained, truncation-aware) views from the same content. No competitor has solved this.
5. **Measure the agent audience.** Analytics that distinguish human vs. agent traffic, per-agent (Claude Code, Cursor, Copilot), per-page, including MCP query logs.
6. **Open beats closed on trust.** Self-hosting, MIT/Apache-style core license, no lock-in. The escape hatch is the sales pitch.

## See also

- `COMPETITIVE_AUDIT.md` — full competitive landscape, scoring matrix, whitespace analysis (June 2026).

## Tech stack

_TBD — fill in once chosen. Candidates discussed: TypeScript/Next.js or Astro-based renderer; MDX content pipeline; Postgres for cloud tier._

## Repo structure

_TBD — no code yet._

## Conventions

_TBD — linting, commit style, branch strategy. Define before first external contributor._

## Commands

_TBD — build/test/dev commands once scaffolded._
