import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const deadStockQuickTemplate: CsvTemplateDefinition = {
	templateId: 'dead-stock-quick-input',
	instrumentId: 'dead-stock-scanner',
	modeId: 'quick',
	version: '1',
	filename: 'dead-stock-quick-input.csv',
	description: 'One row per item. Blank optional fields mean unknown. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'item', required: true, sample: 'example-item' },
		{ id: 'currentStock', required: true, sample: '800' },
		{ id: 'recentMonthlyConsumption', required: true, sample: '10' },
		{ id: 'monthsSinceLastMovement', required: false, sample: '2' },
		{ id: 'futureDemand', required: false, sample: '' },
		{ id: 'unitCost', required: false, sample: '3.5' },
		{ id: 'thresholdMonths', required: false, sample: '' },
	],
};
