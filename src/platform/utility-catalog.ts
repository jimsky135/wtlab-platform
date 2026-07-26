// Utilities Platform Catalog (Sprint 010A). A parallel, independent
// sibling to the Instrument/Workspace catalog (platform/catalog.ts) — see
// docs/engineering.md Sprint 010A entry for the architecture principle:
// Decision Instruments run Input → Decision Engine → Analysis; Utilities
// run Input → Transformation → Output. Different responsibility, so this
// module intentionally does NOT import platform/catalog.ts, tool-contract.ts,
// tool-registry.ts, or anything else from the Instrument Factory — Utilities
// must be able to evolve independently. The two lookup helpers below are a
// small, deliberate duplication of catalog.ts's findById/findBySlug rather
// than a shared import, to keep that independence real rather than nominal.

/** What kind of work a Utility does. Open list — extend as new utilities are added. */
export type UtilityCategory = 'data-preparation' | 'format-transformation' | 'workflow-automation';

/** A Utility's own lifecycle. Deliberately simpler than Instruments' five-state CatalogStatus — utilities don't have a "beta observing production data" phase the way analysis instruments do. */
export type UtilityStatus = 'coming-soon' | 'available' | 'archived';

/** How much of the entry actually exists in this repository. */
export type UtilityImplementationState = 'placeholder' | 'implemented';

/** A Utility: prepares data or automates a repetitive task. Never analyzes or decides. */
export interface UtilityEntry {
	id: string;
	slug: string;
	name: string;
	shortName?: string;
	description: string;
	category: UtilityCategory;
	status: UtilityStatus;
	route: string;
	/** Short glyph shown next to the name in listings/navigation — no icon library dependency. */
	icon: string;
	/** Free-form, human-readable — e.g. "Excel (.xlsx)". Not a machine format contract yet (that arrives with the first real Utility's own spec). */
	inputType: string;
	outputType: string;
	implementationState: UtilityImplementationState;
}

export const ALL_UTILITY_CATEGORIES: readonly UtilityCategory[] = [
	'data-preparation',
	'format-transformation',
	'workflow-automation',
];

export const ALL_UTILITY_STATUSES: readonly UtilityStatus[] = ['coming-soon', 'available', 'archived'];

export const ALL_UTILITY_IMPLEMENTATION_STATES: readonly UtilityImplementationState[] = ['placeholder', 'implemented'];

export function findUtilityById<T extends { id: string }>(entries: readonly T[], id: string): T | undefined {
	return entries.find((entry) => entry.id === id);
}

export function findUtilityBySlug<T extends { slug: string }>(entries: readonly T[], slug: string): T | undefined {
	return entries.find((entry) => entry.slug === slug);
}
