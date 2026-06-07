# Competitive Audit — Docs Portals for the AI Age

**Prepared for:** Thesis (open-core, AI-native documentation portal)
**Date:** June 7, 2026
**Scope:** 14 players — 4 new-generation portals, 2 AI-answer layers, 8 incumbents — scored 0–100 across 13 attributes, plus a target column for Thesis.

---

## 1. Market context (why "docs for the AI age" is real, and where the hype is)

**The agent audience is real.** AI readership of docs published on GitBook grew from <10% to >40% of all readers during 2025 ([GitBook AI docs data](https://www.gitbook.com/blog/ai-docs-data-2025)). Bots crossed 50% of all web traffic in early 2026; AI bot traffic grew 187% in 2025 vs. 3.1% for humans ([CNBC](https://www.cnbc.com/2026/03/26/ai-bots-humans-internet.html)). 25% of docs teams plan to deploy MCP servers within a year — the fastest-growing planned investment ([State of Docs 2026](https://www.stateofdocs.com/2026/ai-and-documentation-consumption)).

**llms.txt is mostly hype.** ~10% adoption across 300K domains ([SE Ranking](https://seranking.com/blog/llms-txt/)), but monitoring of 500M+ AI bot visits found only 408 requests for `/llms.txt` ([aeoengine](https://aeoengine.ai/blog/llms-txt-zero-usage-ai-bots-ignore)). Google explicitly doesn't support it; no major AI provider has committed to it. It matters only for explicitly-configured IDE agents and MCP setups ([HN discussion](https://news.ycombinator.com/item?id=47058870)). Implication for Thesis: ship it (it's table stakes, near-free), but don't market on it — the durable agent surfaces are MCP servers and clean per-page markdown.

**MCP won the protocol question.** Donated to the Linux Foundation's Agentic AI Foundation (Dec 2025) with Anthropic, Block, and OpenAI as co-founders; supported by every major agent client ([MCP/Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol)). Every serious platform shipped MCP generation between Sept 2025 and May 2026 — it stopped being a differentiator in about nine months.

**Money followed the thesis.** Mintlify: $45M Series B at $500M valuation, April 2026, $10M ARR (10x YoY) ([finsmes](https://www.finsmes.com/2026/04/mintlify-raises-45m-in-series-b-funding-at-500m-valuation.html), [Sacra](https://sacra.com/c/mintlify/)). Fern: acquired by Postman, Jan 2026 ([Postman blog](https://blog.postman.com/postman-acquires-fern/)). Inkeep: $13M seed (Khosla). kapa.ai: 200+ enterprise customers incl. OpenAI and Docker.

---

## 2. The players

### New generation ("AI-age" portals)

**Mintlify** — the category leader. Closed SaaS. Zero-config llms.txt/llms-full.txt/.md endpoints + MCP server on all tiers including free; embedded AI assistant on Trieve RAG (acquired Trieve, July 2025); "Workflows" agent watches your codebase and opens docs PRs; first platform with per-agent analytics (which AI agents read which pages, which MCP queries ran). 20K+ companies incl. Anthropic, Coinbase, PayPal. $0 / $250/mo / enterprise. Weaknesses: closed, no self-host, no SDK generation, $250/mo jump from free is steep. ([mintlify.com/pricing](https://www.mintlify.com/pricing), [agent analytics](https://www.mintlify.com/blog/agent-analytics), [MCP generation](https://www.mintlify.com/blog/generate-mcp-servers-for-your-docs))

**Fern** (Postman) — SDK + docs from one spec. Open-core CLI ([fern-api/fern](https://github.com/fern-api/fern)); broadest spec support (OpenAPI incl. Overlays/Arazzo, AsyncAPI, gRPC, GraphQL, OpenRPC); SDKs in 9 languages; Ask Fern assistant; Fern Writer drafts doc PRs; granular AI content tagging (include/exclude sections for agents); MCP generation on Team+. Customers: Square, Webflow, ElevenLabs, Auth0. $0 / $150/mo / enterprise. Risk: post-acquisition direction now tied to Postman. ([buildwithfern.com/pricing](https://buildwithfern.com/pricing), [Postman acquisition](https://blog.postman.com/postman-acquires-fern/))

**Scalar** — fully MIT open source ([scalar/scalar](https://github.com/scalar/scalar), ~12K stars); the default API docs UI in .NET 9. API-reference-first rather than full docs portal. "Agent Scalar" AI assistant; Agent MCP servers from OpenAPI with auth preconfigured (Mar 2026). Cheap: $0 / $72/mo. Weaknesses: no llms.txt/.md endpoints, no AI writing, thin analytics, guides/long-form secondary to API reference. **Closest existing thing to Thesis's open + AI-native position — but API-tool-shaped, not docs-platform-shaped.** ([scalar.com/pricing](https://scalar.com/pricing), [Agent MCP](https://scalar.com/blog/posts/2026-03-17-agent-mcp))

**Theneo** — AI-native API docs, seed-stage (~$500K raised, 21 people). Broadest input formats (REST, GraphQL, gRPC, SOAP, AsyncAPI, Postman); MCP generator; TheneoAI authoring; SearchAI. $0 / $120/mo. Weakness: small team, weak traction signals, closed SaaS. ([theneo.io/pricing](https://www.theneo.io/pricing), [MCP launch](https://www.theneo.io/blog/launch-mcp-server))

### AI-answer layers (not portals — they sit on top of any docs host)

**kapa.ai** — enterprise AI assistant over 30+ knowledge sources; deploys as widget/Slack/Discord/Zendesk/hosted MCP. 200+ customers incl. OpenAI, Docker, Monday.com; 30M+ questions answered. A/B tests at Statsig reportedly beat Mintlify's native AI. Opaque sales-only pricing. ([kapa.ai](https://www.kapa.ai/), [hosted MCP](https://docs.kapa.ai/integrations/mcp/overview))

**Inkeep** — open-core (fair-code) agent platform; hybrid neural+lexical search; automation agents open docs-fix PRs from support tickets; powers docs.claude.com and Midjourney docs. $200/mo+. Pivoting beyond docs into general CX agents. ([inkeep.com](https://inkeep.com/), [pricing](https://docs.inkeep.com/pricing))

*Strategic note: these are potential integration partners or acqui-threats more than direct competitors — but they prove buyers will pay separately for answer quality, which caps the value of a portal's bundled AI chat.*

### Incumbents

**GitBook** — strongest AI-era pivot of any incumbent. Auto llms.txt/llms-full.txt/.md per page (Jan 2025), auto MCP server for every space (Sept 2025), MCP crawl analytics, GitBook Agent proactively proposes doc updates from GitHub/Intercom/Slack signals, adaptive content. Closed SaaS (renderer source-available, self-host unsupported). $0 / $65 / $249/mo + $12/user. ([LLM-ready docs](https://gitbook.com/docs/ai-and-search/llm-ready-docs), [Sept 2025](https://www.gitbook.com/blog/new-in-gitbook-september-2025), [pricing](https://www.gitbook.com/pricing))

**ReadMe** — API-hub veteran; unmatched API *usage* analytics (per-user call logs surfaced to API consumers). llms.txt + .md pages + MCP server (toggle). Ask AI is a +$150/mo add-on. $99–$3,000+/mo. Closed, no self-host. ([readme.com/pricing](https://readme.com/pricing), [MCP server](https://docs.readme.com/main/docs/readmes-mcp-server))

**Document360** — enterprise knowledge bases (McDonald's, NHS, VMware). Eddy AI suite, MCP server (May 2026, Business+), strong SCIM/SSO/i18n. Quote-only pricing with 2026 hikes; weak API-docs story; no llms.txt. ([MCP](https://document360.com/knowledgebase-portal/mcp-server/), [pricing](https://document360.com/pricing/))

**Docusaurus** (Meta) — ~64K stars, MIT, the OSS default. Best-in-class MDX + theming control. Everything AI is community plugins (llms.txt plugin, MCP community projects, Algolia DocSearch v4 "Ask AI" via 3.9). No native AI surface, no analytics, no hosted product. Free. ([github.com/facebook/docusaurus](https://github.com/facebook/docusaurus), [3.9 AI search](https://www.infoq.com/news/2025/10/docusaurus-3-9-ai-search/))

**Read the Docs** — fully OSS hosting/build platform (Sphinx/MkDocs). llms.txt serving added Feb 2026 (bring-your-own). No AI assistant, no MCP. Free for OSS; $50–$250/mo business. ([llms.txt support](https://about.readthedocs.com/blog/2026/02/llms-txt-support/), [pricing](https://about.readthedocs.com/pricing/))

**Redocly** — OpenAPI specialist; Redoc OSS (~26K stars, ~1M weekly downloads). "Copy for LLM" + .md view on every page; MCP server (Sept 2025, Enterprise); OpenAPI 3.2/AsyncAPI/GraphQL/Arazzo. Cheap per-seat ($10–$24/seat/mo). AI assistant still experimental. ([redocly.com/pricing](https://redocly.com/pricing), [Sept 2025 updates](https://redocly.com/blog/updates-2025-09))

**Stoplight** (SmartBear) — design-first API platform; great OSS tools (Spectral, Prism, Elements) but the platform is being absorbed into SmartBear API Hub post-2023 acquisition; customers report forced migrations; desktop editor stalled. No llms.txt; MCP only at SmartBear-suite level. ([pricing](https://stoplight.io/pricing), [apisyouwonthate](https://apisyouwonthate.com/newsletter/goodbye-stoplight/))

**Archbee** — knowledge-portal platform (wiki + dev docs + portal), 14 people, $4M raised. llms.txt/llms-full.txt/MCP included by default; AI features are a +$20/mo add-on with token metering; analytics +$80/mo. Real all-in cost stacks up (~$530+/mo at Scaling). ([archbee.com/pricing](https://www.archbee.com/pricing), [portals page confirming llms.txt/MCP default](https://www.archbee.com/portals/reliant))

---

## 3. Scoring matrix (0–100 per attribute)

Scoring basis: shipped capability as of June 2026, weighted by depth, tier-availability (features locked behind enterprise score lower), and zero-config defaults. N/A = not applicable to that product's category (excluded from averages).

**Thesis column = design targets, not shipped reality. Thesis's shipped score today is 0 on everything — the repo is empty.** The column exists to show where the bar is and what winning requires.

| Attribute | Mintlify | Fern | Scalar | Theneo | GitBook | ReadMe | Doc360 | Docusaurus | RTD | Redocly | Stoplight | Archbee | Inkeep | kapa.ai | **Thesis (target)** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AI-readability (llms.txt, llms-full, .md endpoints) | 95 | 80 | 35 | 75 | 95 | 65 | 25 | 55 | 50 | 80 | 10 | 75 | N/A | N/A | **95** |
| MCP server generation | 95 | 85 | 80 | 75 | 90 | 75 | 65 | 25 | 10 | 70 | 40 | 70 | 55 | 80 | **95** |
| Embedded AI assistant | 90 | 80 | 70 | 75 | 85 | 60 | 75 | 30 | 5 | 45 | 25 | 60 | 95 | 95 | **85** |
| AI authoring / drift prevention | 85 | 85 | 20 | 70 | 85 | 65 | 70 | 5 | 0 | 25 | 30 | 55 | 80 | 45 | **90** |
| Agent analytics | 95 | 50 | 30 | 50 | 80 | 55 | 60 | 5 | 20 | 40 | 15 | 45 | 75 | 85 | **90** |
| API reference (OpenAPI etc.) | 80 | 95 | 90 | 85 | 60 | 85 | 40 | 35 | 30 | 95 | 85 | 55 | N/A | N/A | **75** |
| Authoring experience | 90 | 80 | 75 | 75 | 80 | 75 | 70 | 80 | 50 | 75 | 70 | 70 | N/A | N/A | **85** |
| Open source / self-hosting | 15 | 55 | 90 | 15 | 20 | 5 | 15 | 100 | 95 | 65 | 55 | 10 | 60 | 5 | **95** |
| Customization / theming | 80 | 80 | 80 | 70 | 70 | 70 | 70 | 95 | 50 | 85 | 55 | 65 | N/A | N/A | **85** |
| Search quality | 90 | 75 | 50 | 75 | 80 | 65 | 75 | 70 | 55 | 65 | 40 | 65 | 95 | 90 | **80** |
| Enterprise readiness (SSO, i18n, versioning, residency) | 80 | 85 | 65 | 70 | 80 | 80 | 90 | 40 | 60 | 85 | 70 | 65 | 75 | 80 | **50** |
| Pricing / value | 70 | 75 | 90 | 80 | 75 | 55 | 35 | 100 | 85 | 85 | 60 | 55 | 60 | 40 | **90** |
| Traction / momentum | 95 | 75 | 75 | 40 | 80 | 70 | 65 | 90 | 70 | 75 | 35 | 45 | 70 | 80 | **0** |
| **Average (applicable attributes)** | **81.5** | **76.9** | **65.4** | **65.8** | **75.4** | **63.5** | **58.1** | **56.2** | **44.6** | **68.5** | **45.4** | **56.5** | **75.6** | **74.4** | **84.6*** |

\* Thesis average excludes traction and is aspirational. Read it as "the product spec scores ~85 if executed" — execution is the entire game.

### Scoring rationale (selected — where scores need defending)

- **Mintlify AI-readability 95 / MCP 95 / agent analytics 95:** only platform with all three of zero-config llms-full.txt, .md endpoints, and per-agent behavioral analytics, on every tier including free. Loses points only because closed-source means you can't extend the agent surface yourself.
- **GitBook AI-readability 95:** parity with Mintlify on endpoints (auto llms.txt/llms-full/.md/MCP on all plans, plus "Copy for LLM" / "Open in Claude" UX). Agent analytics 80, slightly behind Mintlify's per-agent granularity.
- **Scalar AI-readability 35:** no llms.txt or .md endpoints as of June 2026; its agent surface is MCP-only. Open source 90: MIT core, but the hosted cloud/registry layer is proprietary (prevents 100).
- **Docusaurus open source 100 / AI everything ≤30:** the cleanest proof of the market gap — maximal openness, zero native AI.
- **kapa.ai assistant 95 / Inkeep search 95:** dedicated answer engines beat every portal's bundled chat (Statsig A/B anecdote vs. Mintlify). That's why "good enough bundled AI" is not a safe assumption for Thesis.
- **Stoplight 45 avg:** post-acquisition drift is a real penalty — forced migrations to SmartBear API Hub and a stalled editor ([apisyouwonthate](https://apisyouwonthate.com/newsletter/goodbye-stoplight/)). Treat as a donor of churning customers, not a threat.
- **Thesis enterprise 50 (target):** deliberately low — SSO/i18n/residency are buy-later problems. Wrong place to spend the first year.

---

## 4. Whitespace — where Thesis can actually win

**1. The open + AI-native quadrant is empty.** Plot every player on openness × AI-nativeness: Mintlify/GitBook sit top-right-closed; Docusaurus/RTD sit open-bottom; Scalar is open but API-reference-shaped; Fern's open core is the SDK compiler, not the portal. Nobody offers a self-hostable docs *platform* with zero-config agent endpoints, MCP, and AI maintenance. That is precisely Thesis's stated position. The Mintlify-but-open wedge also has a proven GTM: every OSS project that outgrows Docusaurus but won't accept SaaS lock-in.

**2. Dual human/agent rendering — unsolved by everyone.** State of Docs 2026's core finding: agent-optimal docs (atomic, self-contained, explicit context) conflict with human-optimal docs (progressive disclosure, cross-references). No platform renders both from one source. The only tooling is a standalone audit script ([afdocs](https://github.com/agent-ecosystem/afdocs)). First platform to do this natively owns the narrative.

**3. Truncation-aware authoring.** Agents silently truncate long pages and may not know it happened ([State of Docs 2026](https://www.stateofdocs.com/2026/ai-and-documentation-consumption)). No platform warns authors "this page exceeds typical agent context budgets" or scores agent-readability at write time. Cheap to build, highly demoable, zero competition.

**4. Drift as a product, not a feature.** 60% of docs are stale within six months ([Document360](https://document360.com/blog/documentation-drift/)). Mintlify Workflows, GitBook Agent, and Fern Writer all attack this — but all closed, all bundled. An open, CI-native drift detector (docs vs. codebase vs. OpenAPI spec) is both a standalone wedge and the strongest possible top-of-funnel for an open-core portal.

**5. Version-aware agent consumption.** Agents have no reliable way to know which doc version matches the code they're working on. Multi-version docs remain painful everywhere. An MCP server that negotiates version context ("I'm on SDK v3.2") is unclaimed territory.

**6. Don't build the answer engine.** kapa/Inkeep beat bundled chat on quality and win even on Mintlify-hosted sites. Thesis should ship a pluggable assistant interface (bring kapa/Inkeep/own-model) rather than competing head-on — turns two would-be competitors into channel partners and fits the open ethos.

### Threats to take seriously

- **Mintlify's velocity**: 10x ARR growth, $67M war chest, ships category-defining features (agent analytics) first. Thesis will not out-feature them; it can only out-open them.
- **GitBook proves incumbents can pivot fast** — 18 months from wiki tool to near-parity with Mintlify on agent surfaces.
- **Feature half-life is ~9 months**: MCP generation went from differentiator to table stakes in under a year. Anything Thesis ships closed-competitors can copy; the durable moats are the license, the community, and self-hosting — which can't be copied by a closed company without destroying their business model.
- **llms.txt skepticism could spread to the whole category**: if "docs for AI" gets tainted by the llms.txt hype cycle, positioning should anchor on measurable outcomes (agent task-completion, deflection) instead of protocol checklists.

---

## 5. Bottom line

The market has validated the category (Mintlify at $500M, Postman buying Fern, GitBook's 40% agent readership) but left one structural gap: **everything AI-native is closed, everything open is AI-naive.** Thesis's open-core + AI-native position is the only unoccupied quadrant, and three of the hardest unsolved problems (dual rendering, truncation-awareness, version-aware MCP) are open-ended enough that a new entrant can lead rather than chase. The honest caveat: Thesis currently scores 0 on every attribute, the category leader ships faster than anyone, and the window for "the open Mintlify" is open now — it will not stay open through 2027.

---

## Sources

Player data: [Mintlify pricing](https://www.mintlify.com/pricing) · [Mintlify Series B](https://www.finsmes.com/2026/04/mintlify-raises-45m-in-series-b-funding-at-500m-valuation.html) · [Mintlify agent analytics](https://www.mintlify.com/blog/agent-analytics) · [Mintlify MCP](https://www.mintlify.com/blog/generate-mcp-servers-for-your-docs) · [Mintlify 2025 review](https://www.mintlify.com/blog/2025-year-in-review) · [Sacra/Mintlify](https://sacra.com/c/mintlify/) · [Fern pricing](https://buildwithfern.com/pricing) · [Postman acquires Fern](https://blog.postman.com/postman-acquires-fern/) · [fern-api/fern](https://github.com/fern-api/fern) · [Scalar pricing](https://scalar.com/pricing) · [Scalar Agent MCP](https://scalar.com/blog/posts/2026-03-17-agent-mcp) · [scalar/scalar](https://github.com/scalar/scalar) · [Theneo pricing](https://www.theneo.io/pricing) · [Theneo MCP](https://www.theneo.io/blog/launch-mcp-server) · [kapa.ai](https://www.kapa.ai/) · [kapa hosted MCP](https://docs.kapa.ai/integrations/mcp/overview) · [Inkeep](https://inkeep.com/) · [Inkeep funding](https://inkeep.com/blog/inkeep-funding-announcement) · [GitBook LLM-ready docs](https://gitbook.com/docs/ai-and-search/llm-ready-docs) · [GitBook Sept 2025](https://www.gitbook.com/blog/new-in-gitbook-september-2025) · [GitBook pricing](https://www.gitbook.com/pricing) · [GitBook Agent](https://www.gitbook.com/features/ai/gitbook-agent) · [ReadMe pricing](https://readme.com/pricing) · [ReadMe MCP](https://docs.readme.com/main/docs/readmes-mcp-server) · [ReadMe Metrics](https://readme.com/metrics) · [Document360 MCP](https://document360.com/knowledgebase-portal/mcp-server/) · [Document360 pricing](https://document360.com/pricing/) · [facebook/docusaurus](https://github.com/facebook/docusaurus) · [Docusaurus 3.9 AI search](https://www.infoq.com/news/2025/10/docusaurus-3-9-ai-search/) · [RTD llms.txt](https://about.readthedocs.com/blog/2026/02/llms-txt-support/) · [RTD pricing](https://about.readthedocs.com/pricing/) · [Redocly pricing](https://redocly.com/pricing) · [Redocly Sept 2025](https://redocly.com/blog/updates-2025-09) · [Redocly/redoc](https://github.com/Redocly/redoc) · [Stoplight pricing](https://stoplight.io/pricing) · [Goodbye Stoplight](https://apisyouwonthate.com/newsletter/goodbye-stoplight/) · [SmartBear MCP](https://github.com/SmartBear/smartbear-mcp) · [Archbee pricing](https://www.archbee.com/pricing) · [Archbee llms.txt/MCP default](https://www.archbee.com/portals/reliant)

Market trends: [GitBook AI docs data 2025](https://www.gitbook.com/blog/ai-docs-data-2025) · [State of Docs 2026 — consumption](https://www.stateofdocs.com/2026/ai-and-documentation-consumption) · [State of Docs 2026 — creation](https://www.stateofdocs.com/2026/ai-and-documentation-creation) · [SE Ranking llms.txt study](https://seranking.com/blog/llms-txt/) · [llms.txt zero usage](https://aeoengine.ai/blog/llms-txt-zero-usage-ai-bots-ignore) · [HN llms.txt thread](https://news.ycombinator.com/item?id=47058870) · [CNBC bots > humans](https://www.cnbc.com/2026/03/26/ai-bots-humans-internet.html) · [MCP](https://en.wikipedia.org/wiki/Model_Context_Protocol) · [Documentation drift](https://document360.com/blog/documentation-drift/) · [afdocs](https://github.com/agent-ecosystem/afdocs) · [AI-generated docs critique](https://passo.uno/whats-wrong-ai-generated-docs/)
