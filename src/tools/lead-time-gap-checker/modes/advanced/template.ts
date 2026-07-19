// Advanced Planning CSV template. Column ids MUST equal the advanced
// intake schema field ids (tested). Sample shows two items over three
// periods with a scheduled arrival and declared lead times.

import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const leadTimeGapAdvancedTemplate: CsvTemplateDefinition = {
	templateId: 'lead-time-gap-advanced-input',
	instrumentId: 'lead-time-gap-checker',
	modeId: 'advanced',
	version: '1',
	filename: 'lead-time-gap-advanced-input.csv',
	description:
		'One row per item per period. Beginning inventory, supplier lead time, and safety buffer go on each item’s first row. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'itemName', required: true, sample: 'example-item-a' },
		{ id: 'period', required: true, sample: '1' },
		{ id: 'beginningInventory', required: false, sample: '100' },
		{ id: 'supplierLeadTimeMonths', required: false, sample: '2' },
		{ id: 'safetyBufferMonths', required: false, sample: '1' },
		{ id: 'consumption', required: true, sample: '30' },
		{ id: 'arrivalQuantity', required: false, sample: '' },
	],
	sampleRows: [
		{ itemName: 'example-item-a', period: '1', beginningInventory: '100', supplierLeadTimeMonths: '2', safetyBufferMonths: '1', consumption: '30', arrivalQuantity: '' },
		{ itemName: 'example-item-a', period: '2', beginningInventory: '', supplierLeadTimeMonths: '', safetyBufferMonths: '', consumption: '30', arrivalQuantity: '50' },
		{ itemName: 'example-item-a', period: '3', beginningInventory: '', supplierLeadTimeMonths: '', safetyBufferMonths: '', consumption: '30', arrivalQuantity: '' },
		{ itemName: 'example-item-b', period: '1', beginningInventory: '60', supplierLeadTimeMonths: '3', safetyBufferMonths: '', consumption: '40', arrivalQuantity: '' },
		{ itemName: 'example-item-b', period: '2', beginningInventory: '', supplierLeadTimeMonths: '', safetyBufferMonths: '', consumption: '40', arrivalQuantity: '' },
	],
};
