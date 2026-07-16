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

## Engineering backlog

| Task | Scope |
|---|---|
| Next: Water Level Checker production UI polish | refine result presentation, edge-case display |
| CSV import and normalization | Data Intake Workspace foundation |
| Save / export package format | first continuity capability, needs ADR |
| Entity domain types | shared entity model for workspaces |
| Workspace context routing | linking instruments to workspace context |
