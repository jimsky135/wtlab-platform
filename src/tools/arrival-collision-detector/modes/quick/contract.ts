import type { ModeContract } from '../../../../platform/modes.ts';

export const arrivalQuickContract: ModeContract = {
	modeId: 'quick',
	label: 'Quick Check',
	description: 'Do a few upcoming arrivals collide in the same period?',
	schemaId: 'arrival-collision-quick',
	templateId: 'arrival-collision-quick-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'arrival-collision-quick',
	exportProfile: {
		inputFilename: 'arrival-collision-quick-input.csv',
		resultFilename: 'arrival-collision-quick-result.csv',
	},
	tier: 'free',
};
