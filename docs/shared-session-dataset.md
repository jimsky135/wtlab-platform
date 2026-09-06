# Shared Session Dataset — Feasibility Note

**Status:** Investigation only. Nothing built. **HOLD until explicitly started.**
**Recorded:** 2026-09-06, after Sprint 011.
**Question asked:** can several instruments share one uploaded dataset, and can
that data stay available across instruments until the session ends?

**Short answer:** partially, and the blocker is not storage — it is that the
same field id does not always mean the same thing.

## 1. What actually overlaps today

Quick-mode intake fields, by concept:

| Concept | Water Level | Lead Time Gap | Buffer Drift | Dead Stock | Demand Wave |
|---|---|---|---|---|---|
| item | `itemName` | `itemName` | `itemName` | **`item`** | `itemName` |
| current stock | `currentStock` | `currentStock` | — | `currentStock` | — |
| monthly consumption | `monthlyConsumption` | `monthlyConsumption` | `monthlyConsumption` | **`recentMonthlyConsumption`** | — |
| lead time | `leadTimeMonths` | `leadTimeMonths` | — | — | — |
| safety buffer | `safetyBufferMonths` | `safetyBufferMonths` | — | — | — |

**Water Level ∩ Lead Time Gap already share five identical field ids.** That
pair is the natural first case — it needs no renaming at all.

## 2. Three classes of blocker

### A. Naming divergence — mechanical

Dead Stock uses `item` and `recentMonthlyConsumption` for concepts the others
call `itemName` and `monthlyConsumption`. Straightforward to reconcile, but the
field ids are also **CSV column ids** — they live in files users have already
downloaded, so renaming is a user-facing contract change, not a refactor.

### B. Same id, different meaning — the real trap

| Field | Water Level | Lead Time Gap |
|---|---|---|
| `monthlyConsumption` | "Must be greater than 0 to run." | "0 means the item never depletes." |
| `leadTimeMonths` | "Replenishment lead time in months." | "Supplier Lead Time — time from placing an order to receiving it." |

The same uploaded value is accepted by one instrument and rejected by the other.
Lead Time Gap's own advanced mode renames the field to `supplierLeadTimeMonths`,
which suggests the distinction was already felt once.

**This has to be resolved as a semantic decision before any sharing layer is
built.** Building the plumbing first would silently propagate the ambiguity.

### C. Different grain — cannot share, and should not

| Instrument | Row means |
|---|---|
| Arrival Collision | one expected arrival (`arrivalDate`, `quantity`) |
| Supplier Dependency | one supplier |
| Demand Wave | one item × seven statistical windows |

These are not item rows. A shared item dataset does not apply to them, and
forcing it would be a false abstraction.

Realistic scope is the **item-row family**: Water Level, Lead Time Gap,
Buffer Drift, Dead Stock.

## 3. Session persistence — mechanically fine, contractually constrained

Current state, verified:

- **Zero** `sessionStorage` / `localStorage` / `IndexedDB` anywhere in `src/`.
- All seven catalog entries declare `dataPersistence: 'none'`.
- `astro.config.mjs` is `output: 'static'` — every instrument is its own URL, so
  navigating between instruments is a full page load. **In-memory sharing is
  impossible; browser storage or a SPA shell is mandatory.**

`sessionStorage` has exactly the requested lifetime: survives navigation within
the tab, cleared when the tab closes.

**But the platform makes a stated promise**, printed on the Continuity page and
the Command Center in both locales:

> User work will never depend only on browser cookies or local site data.
> 使用者的工作內容不會僅依賴瀏覽器 cookie 或本機網站資料。

This does not forbid `sessionStorage`. It constrains its role: a session dataset
may be a **convenience cache only**, with download/export remaining the durable
path. Anything that makes browser storage the sole home of user work breaks the
promise as written.

Separately, `dataPersistence: 'none'` would have to change on the affected
entries — that is a public contract statement, not just a field edit.

## 4. Shape, if it is ever built

Today the platform already has the right seam — the adapter:

```
Confirmed Intake ──adapter──► Instrument Input ──► Engine
```

A session dataset would promote that one level, not replace it:

```
Session Dataset ──adapter──► Instrument Input ──► Engine
```

Which means the prerequisite is a **canonical field vocabulary** for the
item-row family — i.e. resolving §2A and §2B first. The storage layer is the
easy part and should come last.

## 5. Recommended first step (not started)

Do not build a seven-instrument data pool. Validate where the fields are
*already* identical:

**Water Level ↔ Lead Time Gap** — five shared ids, zero renaming cost. Get one
upload feeding both, then decide whether to pull a third instrument in. Only at
that point is it worth paying for the `item` / `recentMonthlyConsumption`
rename and the CSV contract migration it implies.

## 6. Non-goals for now

Not to be implemented as part of this direction:

canonical schema rewrite · CSV column renames · `dataPersistence` contract
change · SPA shell · cross-tab or cross-device sync · server-side session ·
account/login · Phoenix integration · auto-populating one instrument from
another's results

## 7. Open decision, before any code

How do the same-named-but-different-meaning fields converge?

- Is `monthlyConsumption` one concept with one validation rule, or two concepts
  that need distinct ids?
- Is `leadTimeMonths` the same thing as `supplierLeadTimeMonths`?

Until these are answered, the sharing layer has nothing safe to share.

**Deferred deliberately (2026-09-06):** no pointer comments were added to the
Water Level / Lead Time Gap schemas, where §2B's divergence actually lives.
Touching two shipped instruments for an item on hold was judged not worth it.
Add those anchors as part of the same change that resolves §7 — not before.
