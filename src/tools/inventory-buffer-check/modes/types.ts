// Mode contracts for Water Level Checker. Quick Check and Advanced
// Planning are two modes of ONE instrument — different schemas,
// templates, and adapters, but one shared engine and result pipeline.

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
