import type { ModeContract } from '../../../../platform/modes.ts';

export const bufferDriftAdvancedContract: ModeContract = {
	modeId: 'advanced',
	label: 'Advanced Tracking',
	description: 'Multi-item, multi-period drift trend — is the gap between actual and intended buffer widening or narrowing?',
	schemaId: 'buffer-drift-advanced',
	templateId: 'buffer-drift-advanced-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'buffer-drift-advanced',
	exportProfile: {
		inputFilename: 'buffer-drift-advanced-input.csv',
		resultFilename: 'buffer-drift-advanced-result.csv',
	},
	tier: 'professional',
};
