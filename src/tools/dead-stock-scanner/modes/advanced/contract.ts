import type { ModeContract } from '../../../../platform/modes.ts';

export const deadStockAdvancedContract: ModeContract = {
	modeId: 'advanced',
	label: 'Advanced Scan',
	description: 'Scan many SKUs and quantify excess quantity and capital exposure.',
	schemaId: 'dead-stock-advanced',
	templateId: 'dead-stock-advanced-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'dead-stock-advanced',
	exportProfile: {
		inputFilename: 'dead-stock-advanced-input.csv',
		resultFilename: 'dead-stock-advanced-result.csv',
	},
	tier: 'professional',
};
