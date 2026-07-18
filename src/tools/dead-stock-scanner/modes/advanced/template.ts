import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const deadStockAdvancedTemplate: CsvTemplateDefinition = {
	templateId: 'dead-stock-advanced-input',
	instrumentId: 'dead-stock-scanner',
	modeId: 'advanced',
	version: '1',
	filename: 'dead-stock-advanced-input.csv',
	description: 'One row per SKU. Blank optional fields mean unknown. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'item', required: true, sample: 'example-item-a' },
		{ id: 'currentStock', required: true, sample: '800' },
		{ id: 'recentMonthlyConsumption', required: true, sample: '10' },
		{ id: 'monthsSinceLastMovement', required: false, sample: '2' },
		{ id: 'futureDemand', required: false, sample: '' },
		{ id: 'unitCost', required: false, sample: '3.5' },
		{ id: 'category', required: false, sample: 'raw-material' },
		{ id: 'note', required: false, sample: '' },
	],
	sampleRows: [
		{ item: 'example-item-a', currentStock: '800', recentMonthlyConsumption: '10', monthsSinceLastMovement: '2', futureDemand: '', unitCost: '3.5', category: 'raw-material', note: '' },
		{ item: 'example-item-b', currentStock: '500', recentMonthlyConsumption: '0', monthsSinceLastMovement: '14', futureDemand: '0', unitCost: '12', category: 'spare-part', note: '' },
		{ item: 'example-item-c', currentStock: '90', recentMonthlyConsumption: '30', monthsSinceLastMovement: '0', futureDemand: '', unitCost: '', category: '', note: '' },
	],
};
