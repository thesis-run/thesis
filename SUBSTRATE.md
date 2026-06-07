# Substrate — "git for the AI age" (technical north star)

> **STATUS: PARKED (as of 2026-06-07).** Not worth building at this stage. v1 uses git+blob+DB behind `ContentStore` (THESIS.md §3.3). This doc is preserved only so that abstraction is designed with the endgame in mind. Do not build from this yet.

Companion to `THESIS.md` §3.3. This is the *destination*, reached through the portal wedge — not built first. It exists so the v1 `ContentStore` abstraction is designed with the endgame in mind.

## What git actually is (the 7 subsystems you'd re-decide)

git is not one thing; it's a stack. "Building a new git" = re-deciding each layer.

1. **Object model** — a content-addressed store (CAS). 4 object types: `blob` (bytes), `tree` (dir: names→hashes+modes), `commit` (tree + parents + author + msg), `tag`. Keyed by hash (SHA-1 → SHA-256). Loose objects → zlib + delta-compressed packfiles. This makes the whole thing a **Merkle DAG** → integrity + dedup.
2. **History model** — commits linked by parent pointers form a DAG. Branches/tags are just named refs (pointers to a commit hash). HEAD.
3. **Index / working tree** — staging area between disk and the next commit.
4. **Diff & merge** — diff = Myers LCS (line-based). merge = 3-way using the merge-base (lowest common ancestor in the DAG) + text conflict markers. Rename detection is heuristic.
5. **Transport/sync** — smart protocol: ref advertisement → want/have negotiation (graph walk to compute the minimal object set) → packfile transfer. clone/fetch/push.
6. **Refs / reflog / GC** — ref storage, local ref-change log, garbage collection of unreachable objects, repacking.
7. **Interface** — plumbing (hash-object, cat-file, commit-tree…) vs porcelain (the human commands).

## The redesign, layer by layer

| git layer | What git does | AI-age substrate | Hard problem | Prior art to stand on |
|---|---|---|---|---|
| **CAS / object model** | whole-blob, poor binary delta | **content-defined chunking (CDC)** — rolling hash (Rabin/FastCDC) splits files into variable chunks; a "blob" becomes a chunk-manifest. Dedup within/across files & versions. Media chunks → object store/CDN. | chunk boundaries for media; manifest design | restic, borg, casync, Perkeep, IPFS, **XetHub** (git-for-ML-data, acq. Hugging Face) |
| **hash** | SHA-1→SHA-256 | **BLAKE3** (parallel tree-hash, fast on big media) | none really | BLAKE3, git SHA-256 |
| **unit of versioning** | opaque byte files | **typed structured documents** (doc-AST / JSON) and/or **knowledge-graph nodes**, each content-addressed → enables *structural* diff | "what is the atom" — file vs AST vs graph node | CRDT doc models, dolt (git-for-DB) |
| **history** | human-paced commit DAG | **agent-native**: continuous micro-checkpoints rolled up into *semantic* versions; **operation-log** (record ops, not just snapshots); **provenance first-class** (actor=human/agent/model, tool, prompt-hash, confidence) | semantic rollup; op-log compaction | event sourcing, Automerge op-log |
| **diff** | Myers line diff | **semantic/structural diff** of ASTs/graphs → minimal edit script | tree-diff is O(n²–n³); heuristics needed | Zhang-Shasha, **GumTree** |
| **merge** ⭐ | 3-way text, manual conflicts | **CRDT convergence** and/or **patch theory** → automatic merge + real-time multiplayer for many concurrent humans+agents | **the crown jewel; research-grade** (esp. concurrent tree-moves) | **Automerge, Yjs, diamond-types**; **Pijul/Darcs** patch theory; Kleppmann |
| **sync** | want/have + packfile | exchange missing **chunks + ops**; two modes: **live** (WebSocket/WebRTC CRDT broadcast) + **durable** (commit/snapshot); offline-first | live↔durable reconciliation | ElectricSQL, Liveblocks, PartyKit |
| **storage/durability** | local + remote packs | S3-class chunk store + fast KV for refs/manifests + CDN for media; replication | **GC under CRDTs** (causal stability; tombstones) | lakeFS, DVC, restic |
| **permissions** | repo-level, all-or-nothing | **per-node/subtree access control** + per-object encryption keys for true confidentiality | key management; partial-view consistency | capability systems, E2EE docs |
| **identity/provenance** | signed commits (who) | **verifiable AI provenance** — cryptographic attestation of "model X + prompt hash Y produced op Z" | attestation standard; agent identity | sigstore, C2PA, signed commits |
| **query** | none | **index layer**: full-text + vector (semantic) search + graph queries + **time-travel** ("state as of T") | indexing the op-log/DAG efficiently | dolt time-travel, vector DBs |
| **interface** | CLI + libs | CLI + libs **+ agent-native API (MCP/tools) as a first-class porcelain** | designing tool verbs for agents | MCP |

## The crown jewel: merge (where it's won or lost)

Three schools — you're picking a position:

1. **Snapshot + 3-way (git).** Simple, proven, but conflicts are manual and text-shaped. Wrong for high-frequency multi-agent edits.
2. **Patch theory (Darcs/Pijul).** Model history as *patches that commute*; merge becomes algebra. More correct than git's snapshots; steeper theory.
3. **CRDTs (Automerge/Yjs/diamond-types).** *Automatic* convergence, real-time multiplayer, offline-first — the dream for humans+agents editing concurrently. Cost: metadata overhead (Lamport/vector clocks, tombstones) and **structured/rich-doc CRDTs are a research frontier** — concurrent **tree-move** is famously unsolved-in-general (Kleppmann 2021).

For an agent substrate, the gravity is toward **CRDT op-logs for live structured docs + content-addressed snapshots for durable history** — a hybrid. This layer is genuinely PhD-grade; it's the part that earns the name "git for the AI age" or fails.

## What you do NOT rebuild

Be honest: ~half of git is *already the right primitive*. **Content-addressing + the Merkle DAG is timeless** (git, IPFS, restic, Perkeep all converge on it). Keep it. You're not throwing git away — you're keeping its spine (CAS/Merkle DAG) and replacing its 2005-era assumptions about *what a blob is* (→ chunked media), *what a diff is* (→ structural), *how merges happen* (→ CRDT), *who edits* (→ agents, with provenance), and *who can see what* (→ per-object gating).

## The genuinely research-hard list (no sugar-coating)

- Concurrent **tree-move** merge under CRDT — open research.
- **Semantic diff/merge** of rich structured docs — heuristic, no clean general solution.
- **CRDT metadata growth + GC** (causal stability) at scale.
- **You largely can't *merge* video** — you version/branch it; CDC helps storage, not semantics.
- **Durability/consistency at scale** — the unglamorous 80% of the actual work, and where trust is won or lost.

## You're unifying islands, not inventing from zero

The pieces exist separately: CAS+chunking (restic/XetHub), patch theory (Pijul), CRDTs (Automerge/Yjs/diamond-types), data versioning (lakeFS/DVC/dolt), real-time (ElectricSQL/Liveblocks), provenance (sigstore/C2PA). **Nobody has unified them into one agent-native, rich-media, gated, provenance-carrying knowledge substrate.** That unification is the thesis-grade bet — and that's exactly how ambitious infra actually ships: integrate + advance the frontier, don't reinvent the universe.

## How it's actually built — through the wedge, by observed pain

Each phase is independently valuable and triggered by a real pain the portal surfaces. `ContentStore` (read/write/version/snapshot) is the seam; you swap implementations module by module.

- **Phase 0 (v1):** `ContentStore` over **git + blob/CDN + DB**. Ship the portal. Instrument where git hurts. *(weeks)*
- **Phase 1:** own the **media path** — CDC chunked CAS + CDN, manifests. First real git-component you own; high value, low merge complexity, derisks the storage core. *(weeks–months; well-trodden)*
- **Phase 2:** **structured document model + semantic diff** — stop storing opaque md, store doc-AST. Triggered by "diffs are noisy / agents need structure." *(months)*
- **Phase 3:** **CRDT op-log + real-time multiplayer + agent change-streams.** The research-grade core. Triggered by multi-agent concurrency. *(multi-quarter)*
- **Phase 4:** **provenance/lineage + per-object gating + signing.** Triggered by trust/audit demand (ties to the gating moat). *(months)*
- **Phase 5:** **query/index** — vector + graph + time-travel.

By the end you've replaced git entirely, earned the trust git has by age, and built each layer *right* because real usage told you how — instead of guessing the substrate in a vacuum.
