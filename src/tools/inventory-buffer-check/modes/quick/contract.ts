import type { ModeContract } from '../types.ts';

export const quickModeContract: ModeContract = {
	modeId: 'quick',
	label: 'Quick Check',
	description: 'How long will current stock cover a single item?',
	schemaId: 'water-level-quick',
	templateId: 'water-level-quick-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'water-level-quick',
	exportProfile: {
		inputFilename: 'water-level-quick-input.csv',
		resultFilename: 'water-level-quick-result.csv',
	},
	tier: 'free',
};
