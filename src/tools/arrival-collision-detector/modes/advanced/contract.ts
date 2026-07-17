import type { ModeContract } from '../../../../platform/modes.ts';

export const arrivalAdvancedContract: ModeContract = {
	modeId: 'advanced',
	label: 'Advanced Planning',
	description: 'Multi-batch arrival timeline with warehouse capacity and container utilization.',
	schemaId: 'arrival-collision-advanced',
	templateId: 'arrival-collision-advanced-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'arrival-collision-advanced',
	exportProfile: {
		inputFilename: 'arrival-collision-advanced-input.csv',
		resultFilename: 'arrival-collision-advanced-result.csv',
	},
	tier: 'professional',
};
