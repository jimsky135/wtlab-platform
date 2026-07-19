import type { ModeContract } from '../../../../platform/modes.ts';

export const supplierDependencyQuickContract: ModeContract = {
	modeId: 'quick',
	label: 'Quick Check',
	description: 'How dependent is the operation on this one supplier?',
	schemaId: 'supplier-dependency-quick',
	templateId: 'supplier-dependency-quick-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'supplier-dependency-quick',
	exportProfile: {
		inputFilename: 'supplier-dependency-quick-input.csv',
		resultFilename: 'supplier-dependency-quick-result.csv',
	},
	tier: 'free',
};
