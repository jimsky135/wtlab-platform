// Shared mode contract types. Promoted out of the Water Level instrument
// in Sprint 004 — every instrument's modes declare the same contract
// shape so workspaces, templates, and future entitlement gating can
// treat modes uniformly.

export type EntryMethod = 'manual-form' | 'csv-upload' | 'blank-template' | 'input-export';

/** Future commercial tier metadata — informational only, no paywall. */
export type ModeTier = 'free' | 'professional';

export interface ModeContract {
	modeId: string;
	label: string;
	description: string;
	/** IntakeSchema id this mode's CSV/manual data validates against. */
	schemaId: string;
	/** CSV template id registered in the platform template registry. */
	templateId: string;
	supportedEntryMethods: readonly EntryMethod[];
	/** Adapter id in src/platform/adapters/ that feeds this mode. */
	adapterId: string;
	exportProfile: {
		inputFilename: string;
		resultFilename: string;
	};
	tier: ModeTier;
}
