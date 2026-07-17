// Advanced Planning CSV template. Column ids MUST equal the advanced
// intake schema field ids (tested). Sample shows two items over three
// periods with an arrival offset.

import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const advancedCsvTemplate: CsvTemplateDefinition = {
	templateId: 'water-level-advanced-input',
	instrumentId: 'inventory-buffer-check',
	modeId: 'advanced',
	version: '1',
	filename: 'water-level-advanced-input.csv',
	description:
		'One row per item per period. Beginning inventory and safety buffer go on each item’s first row. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'itemName', required: true, sample: 'example-item-a' },
		{ id: 'period', required: true, sample: '1' },
		{ id: 'beginningInventory', required: false, sample: '100' },
		{ id: 'safetyBufferMonths', required: false, sample: '1' },
		{ id: 'consumption', required: true, sample: '30' },
		{ id: 'arrivalQuantity', required: false, sample: '' },
	],
	sampleRows: [
		{ itemName: 'example-item-a', period: '1', beginningInventory: '100', safetyBufferMonths: '1', consumption: '30', arrivalQuantity: '' },
		{ itemName: 'example-item-a', period: '2', beginningInventory: '', safetyBufferMonths: '', consumption: '30', arrivalQuantity: '50' },
		{ itemName: 'example-item-a', period: '3', beginningInventory: '', safetyBufferMonths: '', consumption: '30', arrivalQuantity: '' },
		{ itemName: 'example-item-b', period: '1', beginningInventory: '60', safetyBufferMonths: '', consumption: '40', arrivalQuantity: '' },
		{ itemName: 'example-item-b', period: '2', beginningInventory: '', safetyBufferMonths: '', consumption: '40', arrivalQuantity: '' },
	],
};
