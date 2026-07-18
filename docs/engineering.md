# WTLab Engineering Notes

## Two registries, two jobs

**Execution registry** (`src/platform/tool-registry.ts`, `registry.ts`) — governs whether a tool may *run*. Works only against the Tool Contract (`tool-contract.ts`: `status: draft/active/deprecated` + `enabled`). Gating: a tool is platform-available only when `status === 'active' && enabled === true`. This layer is frozen by ADR/Task decisions; do not extend it for presentation needs.

**Platform catalog** (`src/platform/catalog.ts`, `instruments.ts`, `workspaces.ts`) — describes what *exists in the product architecture*, including instruments that are only planned. Carries presentation metadata: layer, five-state `CatalogStatus` (`draft/prototype/beta/available/archived`), `implementationState` (`placeholder/partial/implemented`), routes, capabilities, core questions, prototype references. The catalog never executes business logic.

The distinction matters: "known in the architecture" (catalog entry) is not "currently usable" (execution registry availability). An implemented instrument links the two via `toolId`.

## Registering a new instrument

1. Add an `InstrumentEntry` to `src/platform/instruments.ts`.
   - Not yet built: `status: 'prototype'`, `enabled: false`, `implementationState: 'placeholder'`, route under `/instruments/{slug}`. A placeholder page is generated automatically.
   - Built: implement the tool under `src/tools/{id}/` against the Tool Contract, register it in `src/platform/registry.ts`, then set `toolId`, `enabled: true`, and an appropriate status/implementationState.
2. Run `node --test src/platform/catalog.test.ts` — uniqueness and consistency checks will catch id/slug/route collisions and enabled-placeholder contradictions.

## Instruments vs. workspaces

- **Instrument**: observes or calculates one operational dimension. Listed in the Instrument Library (`/instruments`).
- **Workspace**: organizes records, entities, observations, decisions. Listed at `/workspaces`, never inside the Instrument Library.
- **Command Center** (`/command`): routes active work. **Continuity Center** (`/continuity`): preserves and transfers user work.

## Route conventions

| Kind | Route |
|---|---|
| Homepage (minimal shell) | `/` |
| Command Center | `/command` |
| Instrument Library | `/instruments` |
| Planned instrument placeholder | `/instruments/{slug}` |
| Implemented tool (first tool, confirmed) | `/tools/inventory-buffer-check` |
| Workspaces index | `/workspaces` |
| Planned workspace placeholder | `/workspace/{slug}` |
| Continuity Center | `/continuity` |

UI contains no calculation logic — tool pages import `validate`/`calculate` from the tool's module.

## Prototype reference policy

Standalone prototype bundles (`Prototype/`, `WTLab Foundations v3(standalone).html`) are visual/product references only. They are gitignored, never bundled, and never copied into production source. Production pages re-implement the visual language via design tokens (`src/shared/tokens.css`).

## Continuity capabilities

Save / Export / Email Copy / Re-import / AI Handoff are typed (`ContinuityAction` in `catalog.ts`, data in `workspaces.ts`) and surfaced as *planned* — disabled controls, honest labels. Product rule: user work must never depend only on browser cookies or local site data. Backend/storage/email integrations require their own ADRs before implementation.

## Instrument integration pattern

Water Level Checker (`src/pages/tools/inventory-buffer-check.astro`) is the first fully integrated production instrument. Future instruments follow the same pattern:

1. **Shell**: the page renders inside `PlatformShell` (`section="instruments"`) — shared navigation, header, footer, focus styles.
2. **Gating**: availability is still decided by the execution registry (`platformRegistry.isAvailable(id)`); an unavailable tool renders a plain message, never the tool UI.
3. **Metadata**: everything displayed about the instrument (name, layer, status, version, core question, description, implementation state) is read from the catalog entry via `findById(instruments, id)` — no constants duplicated into the page.
4. **Capabilities**: the capability panel iterates `ALL_CAPABILITIES` with `CAPABILITY_LABELS` (both from `catalog.ts`) and marks entries not in the instrument's `capabilities` as Future.
5. **Calculation**: the page's client script imports the tool's own `validate`/`calculate` modules; the UI never re-implements rules or formulas. Validation failures render in a grouped panel with an explanation; results render into pre-declared semantic cards (`aria-live`).
6. **Continuity**: Export CSV/JSON is functional client-side (serialization lives in the tool's `export.ts`, unit-tested, separate from UI). Prepare AI Context / Email Copy / Save Session stay disabled and labeled Planned.
7. **Related links**: plain navigation to relevant workspaces — no fake data.

## Shared Data Intake Foundation

`src/platform/intake/` is the reusable intake pattern future instruments use for manual entry and CSV import. It is instrument-agnostic: schemas describe fields; the modules never contain business rules.

**Lifecycle**: raw input → parse (`csv.ts`) → map (`mapping.ts`) → normalize (`normalize.ts`) → validate (`validate.ts`) → preview → confirm (`confirm.ts`) → instrument-ready `ConfirmedIntake`.

**Raw vs. normalized**: every `NormalizedFieldValue` keeps the original `raw` string alongside the normalized `value`, a `changed` flag, and per-field issues. The only transformations are whitespace trimming, blank-as-missing, and explicit number parsing for fields declared `type: 'number'` — each recorded as an `info` issue. No unit guessing, no date/locale inference, no silent repair.

**Validation model**: three severities. `error` blocks confirmation; `warning` stays visible but allows it; `info` explains transformations. Schema-driven checks: required, numeric, declared min/max, declared allowedValues, plus an optional `validateRecord` callback for schema-level rules. Deterministic and unit-tested.

**CSV behavior**: in-repo RFC-4180-subset parser (quotes, `""` escapes, CRLF) — no dependency added. Empty files, missing headers, duplicate headers → errors; inconsistent row lengths → kept and flagged as warnings, never discarded. Unknown columns are preserved under `unknown`, never deleted. Mapping suggestions are exact matches only (trimmed, case-insensitive vs. field id/label); the user reviews every mapping.

**Privacy**: all processing is browser-local. No upload, no storage, no backend.

**Demo**: `/workspace/data-intake` (catalog: `partial`, enabled) demonstrates the full flow. The demo schema lives in `src/pages/workspace/_data-intake-demo-schema.ts` — demo content stays out of the shared modules.

**Future instrument integration** (e.g. Water Level Checker): define an `IntakeSchema` whose field ids match the tool's raw-input fields, run the shared pipeline, and on confirmation adapt `ConfirmedIntake.records` into the tool's own `TRawInput` before its existing `validate`/`calculate`. Example:

```ts
const waterLevelIntakeSchema: IntakeSchema = {
  id: 'water-level-batch',
  title: 'Water Level Batch Check',
  fields: [
    { id: 'currentStock', label: 'Current Stock', type: 'number', required: true, min: 0 },
    { id: 'monthlyConsumption', label: 'Monthly Consumption', type: 'number', required: true },
    // ... lead time / buffer fields
  ],
};
// after confirmIntake(): records.map(r => toolRawInputFrom(r)) → tool.validate → tool.calculate
```

The tool's own validation stays authoritative — intake validation narrows obvious problems early but never replaces it. No second data model is introduced: intake output is adapted to the existing `TRawInput`, not the other way around. Full Water Level Checker migration is deferred.

**Deferred**: backend storage, accounts, database, cloud upload, email, AI/fuzzy mapping, automatic unit conversion, business-rule inference, large-file streaming, XLSX import, saved mapping templates, full Water Level Checker migration, universal form builder, spreadsheet editing.

## Water Level modes & the Reusable Input Loop (Sprint 003.5)

Water Level Checker is one instrument with two modes (`src/tools/inventory-buffer-check/modes/`):

| | Quick Check | Advanced Planning |
|---|---|---|
| Contract | `quickModeContract` (tier: free) | `advancedModeContract` (tier: professional) |
| Schema | `water-level-quick` (one row per item) | `water-level-advanced` (long format: one row per item-period) |
| Template | `water-level-quick-input` | `water-level-advanced-input` |
| Adapter | `src/platform/adapters/water-level/quick-adapter.ts` | `advanced-adapter.ts` |
| Engine | existing `calculate.ts` (unchanged) | new `projection.ts` (rolling balance, instrument-owned) |

`tier` is capability metadata only — no paywall exists; future entitlement gating can read it from the contract/catalog.

**The loop**: manual form values and uploaded CSVs both become intake records against the same schema, then: validate → confirm → adapter → engine. "Download Input CSV" writes current inputs using the same template contract as the blank template, so the exported file re-uploads identically (round-trip tested in `src/platform/adapters/water-level/reusable-loop.test.ts`). User data lives in downloadable files, never in cookies/localStorage.

**CSV template spec** (`src/platform/templates/`): a `CsvTemplateDefinition`'s column ids MUST equal its intake schema's field ids (enforced by `templates.test.ts`). One contract serves three uses: blank template, manual-input export, re-upload. Time values in CSV contracts are always months — no unit columns, no unit guessing.

**Input vs. result files**: `water-level-*-input.csv` (reusable, schema headers) vs. `water-level-*-result.csv` (records/sharing, result-only headers that deliberately fail input mapping — tested). See ADR-0003 for the full adapter pattern rationale.

**Advanced projection definition** (instrument business logic, `projection.ts`): ending balance per period = previous + arrivals − consumption; buffer stock = average consumption × safetyBufferMonths; shortage = ending < 0; risk ranking orders shortage (earliest first), then buffer breach, then ok.

## Second instrument replication (Sprint 004)

Arrival Collision Detector was integrated as the second production instrument to validate that the platform pattern replicates. Verdict: **it does** — the instrument needed only its own schemas, templates, contracts, adapters, engine, and page; every platform layer was reused unmodified:

| Layer | Reused without modification? |
|---|---|
| Shared Intake (`src/platform/intake/`) | ✅ zero changes |
| Template registry + CSV generation | ✅ zero changes (two new template registrations only) |
| Mode contract shape | ✅ (promoted to `src/platform/modes.ts`, see below) |
| Adapter outcome shape | ✅ (promoted to `src/platform/adapters/types.ts`) |
| Execution registry + Tool Contract | ✅ zero changes (second `Tool` registered) |
| CSV intake UI flow | ✅ (extracted to `src/shared/intake-ui.ts`, both instrument pages now share it) |
| Export foundation (`buildCsv`) | ✅ zero changes |
| StatusTag / PlatformShell / catalog | ✅ zero changes |

**Arrival engine v0.1 rules** (instrument business logic, `src/tools/arrival-collision-detector/analyze.ts`): monthly aggregation by strict ISO date → 'YYYY-MM'; peak = highest-quantity month; severe = any month over declared capacity OR peak has ≥2 batches and ≥60% of total quantity; moderate = peak has ≥2 batches and ≥40%; a single batch never collides. Warning priority: capacity exceeded > severe concentration > moderate concentration > container stacking (≥3 distinct containers/month). Dates are never inferred — non-ISO dates are blocking intake errors (schema-level `validateRecord`).

### Architecture review (Sprint 004, Task 007)

Water-Level-specific things found and fixed during replication:

1. `ModeContract` lived under the water-level instrument → promoted to `src/platform/modes.ts` (old path re-exports).
2. `AdapterOutcome` lived in the water-level adapter → promoted to `src/platform/adapters/types.ts` (old path re-exports).
3. The CSV intake UI (`setupCsvIntake` + issue/download helpers) was inlined in the water-level page → extracted to `src/shared/intake-ui.ts`; both instrument pages import it.
4. The homepage hardcoded `/tools/{id}` as every tool's route → now resolves each route from the catalog entry.
5. Instrument placeholder routes now generate only for `implementationState === 'placeholder'` (same rule the workspace placeholders already used), freeing `/instruments/{slug}` for implemented instruments.

Remaining known duplication (accepted for now, queued in the backlog): the two instrument pages share large blocks of page-level CSS and the mode-switch / manual-table wiring pattern. Extracting an "instrument page" layout/component is deliberately deferred until the planned platform-wide UI unification pass, to avoid designing the abstraction before its third consumer exists.

Route note: Water Level keeps its confirmed `/tools/inventory-buffer-check` URL; new instruments live at `/instruments/{slug}` (their catalog route).

## Third instrument & shared UI maturity (Sprint 005)

Dead Stock Scanner is the third production instrument — a materially different analysis model (multi-factor classification + portfolio aggregation, vs. coverage math and timeline aggregation). Platform verdict: Shared Intake, template registry, adapter pattern, execution registry, and export foundation were all reused **without modification**.

**Dead Stock engine v0.1 model** (transparent, deterministic; `src/tools/dead-stock-scanner/analyze.ts`):

- `coverageMonths = stock / consumption` (undefined when consumption = 0)
- `supportedQty = max(futureDemand ?? 0, consumption × highCoverageMonths)`; `excessQuantity = max(0, stock − supportedQty)`
- Classification (first match): no stock → healthy(NO_STOCK) · demand ≥ stock → healthy(FUTURE_DEMAND_SUPPORT) · consumption=0 ∧ demand≡0 ∧ age≥deadMonths → dead-stock · consumption=0 otherwise → dormant (unknown demand/age deliberately blocks a dead verdict) · coverage≥excess → excess-exposure · coverage≥high → slow-moving · else healthy
- Thresholds are explicit and documented: dormant 6m, dead 12m, high coverage 12m, excess 24m (`DEFAULT_THRESHOLDS`); quick mode's optional thresholdMonths overrides high (and excess = 2×)
- Exposure: dead-stock exposes full stock × unit cost; others expose excess × unit cost; missing unit cost → exposure "unknown", portfolio total is a labeled lower bound
- Every result carries reason codes (NO_RECENT_MOVEMENT, NO_FUTURE_DEMAND, HIGH_COVERAGE, EXCESS_QUANTITY, FUTURE_DEMAND_SUPPORT, ACTIVE_CONSUMPTION, UNKNOWN_MOVEMENT_AGE, NO_CONSUMPTION_DATA, NO_STOCK)

**Missing-data policy**: optional fields are never silently defaulted — blank futureDemand/movement-age mean *unknown* and are surfaced as intake warnings; unknown data can only make the verdict *less* severe (dormant instead of dead), never more.

### Task 008 — third-instance shared UI review (decision table)

| Pattern (seen in all 3 pages) | Decision | Outcome |
|---|---|---|
| Instrument header (kicker/title/status/meta/nav) | **A. Promoted** | `src/components/InstrumentHeader.astro` |
| Capability badge panel | **A. Promoted** | `src/components/CapabilityPanel.astro` |
| Mode switcher (markup + wiring) | **A. Promoted** | `src/components/ModeSwitcher.astro` + `initModeSwitcher()` in `src/shared/instrument-ui.ts` |
| Page-level CSS (forms, buttons, tables, cards, issues, mapping) | **A. Promoted** | `src/shared/instrument.css`, namespaced under `.instrument-page` |
| Fixed-column dynamic row table | **A. Promoted** (Arrival ×2 + Dead Stock ×1 mounts; field-driven API, no instrument branching) | `setupRowTable()` in `src/shared/instrument-ui.ts` |
| Water Level period-matrix table | **B. Instrument-specific** — different responsibility (dynamic period columns), single consumer | stays in the WL page |
| Result renderers (cards vs. timeline vs. portfolio) | **B. Instrument-specific** — outputs differ materially; only their CSS classes are shared | per page |
| Action bars / related links | **B. Instrument-specific** — trivial markup, extraction would only move wiring around | per page |
| Manual quick single-item form | **C. Observe** — WL and Dead Stock quick forms are similar; a schema-driven form generator is plausible at the 4th instance | revisit next instrument |

Rule applied: shared components never know instrument names — all APIs take catalog entries, mode contracts, schemas, or field lists.

## Engineering backlog

| Task | Scope |
|---|---|
| Schema-driven quick form generator | WL + Dead Stock quick forms are near-duplicates — extract at the 4th instance (Task 008 class C) |
| Save / export package format | shared continuity package (extends per-tool export), needs ADR |
| Entity domain types | shared entity model for workspaces |
| Workspace context routing | linking instruments to workspace context |
| Fourth instrument | Demand Wave Radar or Lead Time Gap Checker — should now cost less than the third |
| Saved mapping templates | remember user column mappings (deferred from Sprint 003.5) |
| Dead Stock category insights | category field is captured but not yet aggregated (v0.1 scope) |
| SEO minimum pass | meta descriptions, canonical tags, Open Graph, robots.txt/sitemap (optional, not launch-blocking — from Deployment 001 audit) |
