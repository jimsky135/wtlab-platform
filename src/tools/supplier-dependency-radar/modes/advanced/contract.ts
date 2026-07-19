import type { ModeContract } from '../../../../platform/modes.ts';

export const supplierDependencyAdvancedContract: ModeContract = {
	modeId: 'advanced',
	label: 'Advanced Scan',
	description: 'Many supplier-material relationships — where does structural dependency concentrate across the whole portfolio?',
	schemaId: 'supplier-dependency-advanced',
	templateId: 'supplier-dependency-advanced-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'supplier-dependency-advanced',
	exportProfile: {
		inputFilename: 'supplier-dependency-advanced-input.csv',
		resultFilename: 'supplier-dependency-advanced-result.csv',
	},
	tier: 'professional',
};
