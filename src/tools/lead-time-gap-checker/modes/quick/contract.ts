import type { ModeContract } from '../../../../platform/modes.ts';

export const leadTimeGapQuickContract: ModeContract = {
	modeId: 'quick',
	label: 'Quick Check',
	description: 'Will replenishment arrive before this item runs out?',
	schemaId: 'lead-time-gap-quick',
	templateId: 'lead-time-gap-quick-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'lead-time-gap-quick',
	exportProfile: {
		inputFilename: 'lead-time-gap-quick-input.csv',
		resultFilename: 'lead-time-gap-quick-result.csv',
	},
	tier: 'free',
};
