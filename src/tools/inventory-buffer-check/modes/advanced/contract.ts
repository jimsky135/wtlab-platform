import type { ModeContract } from '../types.ts';

export const advancedModeContract: ModeContract = {
	modeId: 'advanced',
	label: 'Advanced Planning',
	description: 'Multi-item, multi-period coverage with consumption and arrival offsets.',
	schemaId: 'water-level-advanced',
	templateId: 'water-level-advanced-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'water-level-advanced',
	exportProfile: {
		inputFilename: 'water-level-advanced-input.csv',
		resultFilename: 'water-level-advanced-result.csv',
	},
	tier: 'professional',
};
