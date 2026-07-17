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

## Engineering backlog

| Task | Scope |
|---|---|
| Water Level Checker batch intake | adapt confirmed intake data into the tool's `TRawInput` (adapter only) |
| Save / export package format | shared continuity package (extends per-tool export), needs ADR |
| Entity domain types | shared entity model for workspaces |
| Workspace context routing | linking instruments to workspace context |
| Second instrument implementation | apply the integration pattern end-to-end |
