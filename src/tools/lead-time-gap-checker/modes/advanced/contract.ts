import type { ModeContract } from '../../../../platform/modes.ts';

export const leadTimeGapAdvancedContract: ModeContract = {
	modeId: 'advanced',
	label: 'Advanced Planning',
	description: 'Multi-item, multi-period gap windows with rolling consumption and scheduled arrivals.',
	schemaId: 'lead-time-gap-advanced',
	templateId: 'lead-time-gap-advanced-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'lead-time-gap-advanced',
	exportProfile: {
		inputFilename: 'lead-time-gap-advanced-input.csv',
		resultFilename: 'lead-time-gap-advanced-result.csv',
	},
	tier: 'professional',
};
