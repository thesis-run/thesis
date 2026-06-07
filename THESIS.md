# Thesis — Product Plan

> Single source of truth. Everything below is decided unless marked **[open]**.
> Last updated: 2026-06-07.

---

## 1. What Thesis is

**Thesis is the structure + access + hosting layer for documents an AI agent writes.**

You bring your own agent (Claude, Codex, anything with the Thesis MCP). It drafts the words. Thesis is where those docs are **organized, gated, branded, and published to your own domain** as a beautiful documentation portal.

One line: *MCP-authored, MDX-rendered, open-engine, paid-operation, gated-portal hosting.*

Mental model: **a git-backed content repository for rich docs, with a portal + rendering in tow.** Content of record = portable markdown + media in a git repo (yours or managed) — durable, exportable, agent-collaborative, no lock-in (the "your stuff isn't going anywhere" peace of mind GitHub gives code). Thesis adds the layer git lacks for docs: structure, rich rendering, access-gating, custom domains, served snapshots. **Lock-in is on the experience, never the files.**

Comparable category: GitBook / Mintlify / Readme — but **AI-native (BYO agent), open-core, and built for access-gated/confidential portals** (patents, data rooms, compliance, investor docs, internal wikis), which the incumbents do poorly. Git-backing is table stakes for trust, not the moat — the moat is rich media + gating + MCP + the portal. **Do not try to out-GitHub GitHub: use git as the substrate, don't reimplement it.**

---

## 2. Why it exists — the workflow it formalizes

This is Ali's actual manual workflow today, with the boring parts removed:

1. Ask the CLI agent to draft a doc → 2. It saves to a gist → 3. Read it, hand-edit → 4. Tell the agent "turn this into a read-only hosted documentation portal."

Steps 1–3 already work and stay outside Thesis. Thesis **formalizes step 4** (and everything it implies: structure, render, gate, host, publish) so it stops being a one-off rebuild every time.

### Value chain — where each link lives

| Stage | Today | In Thesis? | Why |
|---|---|---|---|
| Draft the words | CLI agent | ❌ outside | Commodity. BYO agent. Never build/charge for it. |
| Store the source file | gist | ⚠️ pointer only | File stays in gist/github; Thesis records *where*. |
| Read / hand-edit | gist UI | ⚠️ thin convenience editor | Edit in gist *or* Thesis; gist is source of truth. |
| **Structure** (tree, order, grouping) | in your head | ✅ **core** | The catalog/IA you keep rebuilding. |
| **Render** (md → portal, TOC, media) | one-off React page | ✅ **core** | Renderer + component registry, built once. |
| **Gate** (access keys) | hardcoded | ✅ **core** | Governance. Moat. |
| **Host + custom domain** | manual deploy | ✅ **core** | Operation. Moat. **The value driver.** |
| **Publish / preview** | manual | ✅ **core** | The button that makes it live. |

**Principle:** *Outside = writing the words. Inside = everything that turns files into a governed, hosted, structured portal.* The **MCP is the bridge** between the two halves.

---

## 3. Locked strategic decisions

1. **Orchestrator, not in-app AI (M3).** No bundled chat sidebar in v1. The user's own agent authors via the MCP. Zero AI cost to us, smallest surface, dogfoods on Robomart's own docs immediately. A BYO-key sidebar can bolt on later without a rebuild.
2. **Portable markdown + directives**, not raw MDX-by-default and not TipTap-JSON-in-DB. Format = plain `.md` with directives/shortcodes (`:::video{src=…}`, `:::diagram{…}`) that Thesis renders into rich components from a **bounded registry**, and that **degrade gracefully** elsewhere (text, not breakage) — so files stay diffable, agent-safe, and portable (no lock-in). **MDX/JSX = optional power-user escape hatch**, not the default. This is the portable formalization of the masterplan page (see §7).
3. **Compose the substrate from git + blob + DB — do NOT rebuild git.** Content of record = a **composition**: *text* (markdown + directives) → **git** (BYO repo on GitHub for v1; managed later — versions beautifully, agent-native, portable); *media bytes* (video/large binaries, where git is weak) → **object storage / CDN**, content-addressed, referenced from the markdown; *metadata* (structure, keys, access, domains, snapshots) → **DB**. `Publish` freezes a **served snapshot** so the live site never depends on repo uptime. Sources (gist/github/pdf/docx/upload/inline) are *inputs* ingested into this store — ingestion *is* conversion (you can't "point at" a PDF). **git = the open format we commit to; GitHub = the default host, not a hard lock** (GitLab/Gitea/bare-git later). Wrap it all behind a `ContentStore` abstraction (read/write/version/snapshot) so the substrate is swappable. See §6.
   - **North star: a version-control + collaboration substrate for the AI age** ("git for AI-age knowledge"). git's 2005 assumptions are wrong for now — line diffs (vs semantic diffs), human-paced commits (vs agent change-streams + intent history), text merge conflicts (vs CRDT/semantic merge), binary-as-bolt-on (vs native rich media), repo-as-file-tree (vs knowledge graph), no provenance (vs model/prompt lineage), all-or-nothing perms (vs per-object gating). Nobody owns this; it is plausibly category-defining. **This is the destination, reached *through* the portal — not built first.** The product is the data engine that reveals which of git's assumptions to replace first (you can't design the git-killer in a vacuum; you build it by watching agents break git on real users' content), and it starts the trust clock you can't acquire by decree. **Sequencing, not difficulty, is the reason A precedes B** — A is Act 1 of B. The `ContentStore` abstraction is the seam where the new substrate slides in, module by module, as usage proves each piece. (Pattern: GitHub built *on* git; git itself was a 2-week tool for the kernel that generalized by being used; AWS/Stripe/Figma all entered through a wedge and revealed the platform.)
4. **Open-core.** Open MIT engine (MCP, renderer, registry, self-host viewer, access primitives). Private paid cloud (multi-tenant hosting, custom domains, access control plane, audit, billing). Mirrors the Circuit model.
5. **Custom domains are core v1**, not deferred. They are the primary driver of value and the paid trigger.
6. **Design: GitHub's bones, Notion's skin — published output is pure publication.** Two surfaces, two rules. The **operator app** borrows GitHub's *information model* (file tree, source⇄preview toggle, publish-as-deploy + status, history-as-commits, keys-as-refs — all of which map 1:1 to the docs-as-code architecture and fit the v1 technical audience) but renders it with **minimalist restraint** (monochrome, whitespace, keyboard-first — think Linear/Vercel, not GitHub's dense gray chrome). The **published portal** is always the beautiful, reading-optimized petition style — never code-host chrome. Minimalism is the scope discipline. Soften the operator skin later for non-technical users; the bones stay.

---

## 4. Concepts & naming

Do **not** reuse "Thesis" as a unit name (reserve it for the product).

| Level | Name | Is | Maps to |
|---|---|---|---|
| 1 | **Workspace** | the company account | login, billing, members, domains. e.g. `Robomart` |
| 2 | **Portal** | a publishable collection of docs + its own domain/path + access policy | one custom domain *or* a path. e.g. `Master Plan`, `External Docs` |
| 3 | **Section** | a folder in a portal's tree | just nesting. e.g. `Engineering`, `Design` |
| 4 | **Doc** | one content file → points to a source | one rendered page. e.g. `spec`, `prd`, `cad` |

- Post-login → **Workspace overview** (grid of Portals).
- Click a Portal → its **tree** (Sections + Docs).
- Click a Doc → **Source / Preview / Publish** view.
- The MCP operates **scoped to a Portal**.

### Keys (addressing for the agent)
- Every **Doc** and **Portal** has a short prefixed stable key: `doc_7Fk2q9`, `prt_x3M…` (Stripe/Linear style — paste-able, opaque, survives renames/moves).
- The MCP accepts the **key (canonical)** *or* a **slug path** (`robomart/plan/spec`, convenience). On an ambiguous name it **returns candidates and asks — never guesses** (it's a mutation).
- **Key = address, not auth.** Auth is the workspace MCP connection (API key / OAuth), set up once. The key only says *which object*. Never let a key double as a capability token.
- Copy-key affordance lives **in the app's doc view (dropdown)**, not on the public rendered footer (avoid leaking internal IDs to readers).

---

## 5. Data model

Entities (Supabase / Postgres, RLS-scoped by `workspace_id`):

- `workspaces` — id, name, slug, owner, plan/billing.
- `members` — workspace_id, user_id, role.
- `portals` — id, key (`prt_…`), workspace_id, name, slug, access_policy (`public` | `gated`), theme.
- `sections` — id, portal_id, parent_id (nullable, for nesting), name, order.
- `content_repos` — workspace_id, provider (`github`), repo, branch, install/token ref. The git-backed store of record (BYO for v1; managed later).
- `docs` — id, key (`doc_…`), workspace_id, title, slug, `repo_path` (the `.md` file in the content repo — source of truth), `source` (`{type: gist|github|pdf|docx|upload|inline, ref, last_synced}` — original input / re-sync), `cached_md` (working copy for fast preview).
- Storage bucket — original uploaded blobs (pdf/docx) + assets extracted during ingestion (images, etc.); media files also committed to the repo.
- `doc_placements` — doc_id, portal_id, section_id, order. **The many-to-many join** (a doc can appear in multiple portals). *v1 ships 1 placement/doc; schema supports many.*
- `doc_snapshots` — doc_id, portal_id, rendered_html/mdx, published_at, published_by. **The published frozen output.**
- `domains` — id, portal_id, hostname, base_path, cf_hostname_id, tls_status. **Custom-domain mapping.**
- `access_keys` — id, key (`robo-xxxx-xxxx`), portal_id, status, expires_at, last_used_at. *(Ported from petition.)*
- `stakeholders` — id, portal_id, name, email, org, short_code. *(Ported from petition.)*
- `access_logs` — access_key_id, ts, ip, user_agent, action. *(Ported.)*

**Snapshot model (the core mechanic):**
- Draft = Thesis-hosted normalized content (ingested from the source). The source back-pointer enables optional re-sync ("pull latest from gist X").
- `Publish` = take a new `doc_snapshot`. The live portal serves snapshots only.
- **The agent (via MCP) publishes directly** (explicit tool call). **Manual web edits stage a draft and require the Publish button.** Same mechanism, two triggers.

---

## 6. Content & rendering

- **Ingest into the repo, don't just link.** A source is an *input*; Thesis converts it to markdown committed to the content repo. v1 nails **md / gist / github URL** (clean) + **paste/upload**. **pdf/docx = basic text-extraction in v1.5** (perfect-fidelity conversion is a tar pit — md-first, everything-else progressively). Drive/Notion/S3 later. The **MCP can commit directly to the repo** (agents write docs into git, Thesis renders elsewhere).
- **Format:** **MDX.** Markdown for prose; rich media as inline components from a **curated registry** (`<Video>`, `<Diagram>`, `<Scrollytelling>`, plus the ported masterplan components). The agent composes from the registry; it does **not** generate arbitrary React.
- **Renderer:** MDX → the petition `DocumentationLayout` shell (sticky header, left TOC, scroll-spy, prose typography, download). The registry is the bounded, code-side surface; placement lives in the content.

---

## 7. The masterplan precedent (proof of model → MDX upgrade)

`rm/robomart/website/src/pages/Plan.tsx` is a hand-built v0 of this exact merge:
- Content = a gist fetched at runtime (decoupled from deploy). ✅ keep this shape.
- Rendering = a hand-rolled parser that injects bespoke React animations (`DeploymentStrategyGraphic`, `ConjureDemoGraphic`, `TypewriterFinale`) by **matching magic sentences** (`if (line.includes("Robomart is that company"))`). ⚠️ brittle, requires code+redeploy per element, invisible coupling.
- Gate = hardcoded access code in sessionStorage. ⚠️ primitive.

**Thesis upgrade:** move placement from `line.includes()` in code → inline `<Component/>` in the `.mdx`. Those three animation components **become the seed of the Thesis component registry.** Masterplan is v0; MDX is the same idea made composable, plus real access keys + real hosting.

---

## 8. Custom domains & hosting (core v1)

**Topology** (decided)
- `thesis.run/` — marketing; `thesis.run/{workspace}/…` — the authenticated app (GitHub/Vercel style; reserve top-level slugs like `/pricing`, `/login`). App session cookies are **host-only on `thesis.run`** (never `Domain=.thesis.run`) so they don't leak to portal origins.
- `*.thesis.run` — free-tier published portals (wildcard DNS), **separate origins** from the app.
- Custom domains (`masterplan.robomart.ai`, `docs.acme.com`) — via **Cloudflare for SaaS / Custom Hostnames**. (Robomart is already Cloudflare-native; petition runs there today.)
- **Hard rule:** published portals live ONLY on subdomains/custom domains, never on the apex path — for cookie/security isolation, and because custom domains require host-based routing regardless. No `app.thesis.run` needed.

**Custom-domain flow**
1. Portal settings → enter domain.
2. Thesis shows a CNAME target (`cname.thesis.run`).
3. User adds the CNAME at their DNS (trivial for Robomart's own zone).
4. Thesis calls the Cloudflare for SaaS API → registers the custom hostname → **TLS auto-provisions**.
5. Renderer reads the `Host` header → resolves `domains.hostname` → portal → serves the published snapshot (gated if access keys are set).

**Path vs subdomain are the same primitive:**
- `masterplan.robomart.ai` → the *Master Plan* portal at `/`.
- `docs.robomart.ai/plan` → the *Docs* portal at `docs.robomart.ai`, with a `plan` doc/section.
- Same content in both (standalone *and* nested) = many-to-many `doc_placements`. *v1 = one placement; cross-listing is v2.*

**Gating + SPA:** keep petition's model — the SPA shell loads for any hostname, resolves the portal, and the **published content API only returns a snapshot for a valid access key** (gated portals) or freely (public). Good-enough gating that reuses what's built. *SSR for public-portal SEO is a v2 enhancement.*

---

## 9. The MCP (the bridge)

Open-source, installed into the user's agent, authed once to the workspace. Tools (v1):
- `list_portals` / `list_docs(portal)` — see the catalog.
- `get_doc(ref)` — fetch source + metadata by key or slug.
- `create_doc(portal, title, source)` — add a doc (point at a gist/github URL or pass content).
- `update_doc(ref, content)` — write new content / repoint source.
- `set_structure(portal, tree)` — reorder / move docs & sections.
- `publish(ref)` — snapshot + go live.
- `get_registry()` — list available MDX components so the agent knows what it can place.

Scope is per-Portal; everything is `workspace_id`-gated by the auth token.

---

## 10. App UX

- **Landing** (Circuit-style, `circuit/src/pages/Home.tsx` as template): centered hero, one-line tagline, two CTAs, an **animated mockup** showing the editor on the left morphing into the published portal on the right ("write here → publish there"), how-it-works, footer. `AnimatedGrid` background. Dark, mono+sans.
- **Auth** → **Workspace overview**: grid of Portals + "New Portal."
- **Portal**: the **tree** (Sections + Docs), hover-to-add (`+` → "point me at a gist / github / paste"), breadcrumb header (`Robomart / Docs / Engineering`, Clerk-style — ported from primary).
- **Doc view**: **Source** (editable markdown/MDX) · **Preview** (rendered). Top-right **Publish ▾** → dropdown reveals the live URL + "View live." Draft/published state. Copy-key button.
- **Admin / access**: per-Portal access keys + stakeholders (ported from petition).
- **Design language:** petition's tokens (monochrome, Chakra Petch / Inter / Space Mono). Operator app = GitHub's information model + minimalist skin (Linear/Vercel-grade restraint). Published portal = pure publication beauty. See §3.6.

---

## 11. Repo plan

- **Base: clone `thesis-run/rmpetition` → `thesis-run/thesis`.** It already has the three hardest valuable pieces clean: `DocumentationLayout` (TOC + scroll-spy), the **real access-key/stakeholder admin**, the access **schema**, and the exact design tokens. Single-purpose = little to strip.
- **Leave `primary` alone.** Port three patterns from it *by reading* (`/tmp/thesis_primary`), not by cloning/merging: the **breadcrumb header**, **workspace-scoped multi-tenancy + RLS**, and the **preview-token** idea.
- **Surgery on petition:**
  - Keep: `DocumentationLayout`, access/admin, Supabase access schema, design tokens.
  - Rip out: TipTap's **rich-text WYSIWYG + JSON-in-Supabase storage** (content of record is now markdown-in-git). **Editing is preserved, not removed.**
  - Replace with: the **markdown + directives** pipeline (§6–7) — a **markdown source editor (CodeMirror) + live preview** rendering the component registry. (WYSIWYG layer is a v2 nicety; markdown↔directives round-trip is fiddly.)
  - Add: Workspace→Portal→Section→Doc layer, the tree UI, gist/github source pointers, doc/portal keys, custom-domain handling (§8), the MCP (§9), the Circuit-style landing.

---

## 12. Open-core boundary & pricing

| Open (MIT, public repo) | Closed (paid cloud) |
|---|---|
| MCP server | Multi-tenant hosting + dashboard |
| MDX renderer + component registry | Custom domains at scale + managed TLS |
| Single-tenant self-host viewer + `DocumentationLayout` | Access-management control plane |
| Access-key primitives (lib) | Audit logs / analytics |
| Schema + thin inline editor | Teams / SSO / billing |

**Pricing value metric:** public portal on `*.thesis.run` → **free** (top of funnel, every portal markets us). **Custom domain + gating + audit → paid** (per portal or per seat). The paid trigger = exactly the thing AI can't do for you: governed operation on your own domain.

---

## 13. Scope — v1 vs deferred

**v1 (ship this):** one Workspace · multiple Portals · tree (sections/docs) · gist/github source + paste · MDX render + ~3 seed components (masterplan trio) · draft→publish snapshot · doc/portal keys · access keys (gating) · **custom domains (subdomain + path)** · Circuit-style landing · open MCP.

**Deferred (v2+):** doc-in-many-portals cross-listing · Drive/Notion/S3 importers · in-app BYO-key AI sidebar · teams/SSO/analytics · SSR for public-portal SEO.

---

## 14. Tech stack

Vite + React + TypeScript + Tailwind + shadcn + Supabase (auth, Postgres, RLS, Storage, edge functions). MDX rendering pipeline + component registry. Cloudflare for SaaS for custom hostnames. Bun. Deploy on the existing Cloudflare-fronted host (matches petition).

---

## 15. Open questions [open]

- ~~Apex/marketing domain~~ **RESOLVED:** app at `thesis.run/{workspace}`, marketing at apex, published portals on subdomains/custom domains only (see §8).
- **Inline-content storage:** for "paste" docs, store content in Supabase vs auto-create a gist — TBD (lean Supabase for simplicity).
- **MDX security:** sandbox/allowlist the component registry so untrusted MDX can't execute arbitrary code (matters once non-Robomart workspaces exist).
- **Free-tier abuse / domain limits** on the open self-host path.
