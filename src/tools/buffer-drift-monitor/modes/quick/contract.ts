import type { ModeContract } from '../../../../platform/modes.ts';

export const bufferDriftQuickContract: ModeContract = {
	modeId: 'quick',
	label: 'Quick Check',
	description: 'Is this item’s actual buffer still the size the policy intended?',
	schemaId: 'buffer-drift-quick',
	templateId: 'buffer-drift-quick-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'buffer-drift-quick',
	exportProfile: {
		inputFilename: 'buffer-drift-quick-input.csv',
		resultFilename: 'buffer-drift-quick-result.csv',
	},
	tier: 'free',
};
