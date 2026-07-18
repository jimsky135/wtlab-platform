import type { ModeContract } from '../../../../platform/modes.ts';

export const deadStockQuickContract: ModeContract = {
	modeId: 'quick',
	label: 'Quick Check',
	description: 'Is this one item healthy, slow-moving, dormant, or dead stock?',
	schemaId: 'dead-stock-quick',
	templateId: 'dead-stock-quick-input',
	supportedEntryMethods: ['manual-form', 'csv-upload', 'blank-template', 'input-export'],
	adapterId: 'dead-stock-quick',
	exportProfile: {
		inputFilename: 'dead-stock-quick-input.csv',
		resultFilename: 'dead-stock-quick-result.csv',
	},
	tier: 'free',
};
