// Platform Catalog — presentation/navigation metadata for instruments
// and workspaces. This layer is deliberately separate from the executable
// Tool Contract (tool-contract.ts), which stays unchanged: the contract's
// `status: draft/active/deprecated` + `enabled` still governs whether a
// tool may EXECUTE (see tool-registry.ts), while the catalog describes
// what exists in the product architecture — including instruments that
// are only planned. The catalog never executes business logic.

/** Which platform layer an entry belongs to. */
export type ToolLayer = 'observe' | 'think' | 'work' | 'continue' | 'platform';

/** Product-facing lifecycle, richer than the execution contract's status. */
export type CatalogStatus = 'draft' | 'prototype' | 'beta' | 'available' | 'archived';

/** How much of the entry actually exists in this repository. */
export type ImplementationState = 'placeholder' | 'partial' | 'implemented';

/** Planned or present capabilities an instrument can declare. */
export type Capability =
	| 'csv-import'
	| 'manual-input'
	| 'calculate'
	| 'save'
	| 'export'
	| 'email-copy'
	| 're-import'
	| 'ai-handoff';

/** How an entry's user data persists. MVP tools keep nothing. */
export type DataPersistence = 'none' | 'export-file' | 'planned';

/** An instrument: observes or calculates one operational dimension. */
export interface InstrumentEntry {
	id: string;
	slug: string;
	displayName: string;
	shortName: string;
	description: string;
	layer: ToolLayer;
	category: string;
	status: CatalogStatus;
	enabled: boolean;
	route: string;
	version: string;
	coreQuestion: string;
	capabilities: Capability[];
	dataPersistence: DataPersistence;
	exportFormats: string[];
	implementationState: ImplementationState;
	/** Executable Tool id in the platform registry, when one exists. */
	toolId?: string;
	/** Prototype reference filenames (visual reference only, never bundled). */
	prototypeRefs: string[];
}

/** A workspace: organizes records, entities, observations, or decisions. */
export interface WorkspaceEntry {
	id: string;
	slug: string;
	displayName: string;
	description: string;
	layer: ToolLayer;
	status: CatalogStatus;
	enabled: boolean;
	route: string;
	coreQuestion: string;
	implementationState: ImplementationState;
	prototypeRefs: string[];
}

/** A future continuity capability, surfaced honestly as planned. */
export interface ContinuityAction {
	id: Capability;
	label: string;
	description: string;
	state: 'planned';
}

export const ALL_LAYERS: readonly ToolLayer[] = ['observe', 'think', 'work', 'continue', 'platform'];

/** Display order + labels for capability badges. Pages read this instead
 *  of hardcoding capability names. */
export const ALL_CAPABILITIES: readonly Capability[] = [
	'manual-input',
	'csv-import',
	'calculate',
	'save',
	'export',
	'email-copy',
	're-import',
	'ai-handoff',
];

export const CAPABILITY_LABELS: Record<Capability, string> = {
	'manual-input': 'Manual Input',
	'csv-import': 'CSV Import',
	calculate: 'Calculation',
	save: 'Save',
	export: 'Export',
	'email-copy': 'Email Copy',
	're-import': 'Re-import',
	'ai-handoff': 'AI Handoff',
};
export const ALL_CATALOG_STATUSES: readonly CatalogStatus[] = [
	'draft',
	'prototype',
	'beta',
	'available',
	'archived',
];
export const ALL_IMPLEMENTATION_STATES: readonly ImplementationState[] = [
	'placeholder',
	'partial',
	'implemented',
];

export function findBySlug<T extends { slug: string }>(entries: readonly T[], slug: string): T | undefined {
	return entries.find((entry) => entry.slug === slug);
}

export function findById<T extends { id: string }>(entries: readonly T[], id: string): T | undefined {
	return entries.find((entry) => entry.id === id);
}
