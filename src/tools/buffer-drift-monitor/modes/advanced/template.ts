// Advanced Planning CSV template. Column ids MUST equal the advanced
// intake schema field ids (tested). Sample shows two items over three
// periods with the actual buffer drifting away from the policy target.

import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const bufferDriftAdvancedTemplate: CsvTemplateDefinition = {
	templateId: 'buffer-drift-advanced-input',
	instrumentId: 'buffer-drift-monitor',
	modeId: 'advanced',
	version: '1',
	filename: 'buffer-drift-advanced-input.csv',
	description: 'One row per item per period. Intended buffer goes on each item’s first row. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'itemName', required: true, sample: 'example-item-a' },
		{ id: 'period', required: true, sample: '1' },
		{ id: 'intendedBufferMonths', required: false, sample: '1' },
		{ id: 'monthlyConsumption', required: true, sample: '20' },
		{ id: 'actualBufferQuantity', required: true, sample: '20' },
	],
	sampleRows: [
		{ itemName: 'example-item-a', period: '1', intendedBufferMonths: '1', monthlyConsumption: '20', actualBufferQuantity: '20' },
		{ itemName: 'example-item-a', period: '2', intendedBufferMonths: '', monthlyConsumption: '20', actualBufferQuantity: '12' },
		{ itemName: 'example-item-a', period: '3', intendedBufferMonths: '', monthlyConsumption: '20', actualBufferQuantity: '6' },
		{ itemName: 'example-item-b', period: '1', intendedBufferMonths: '2', monthlyConsumption: '10', actualBufferQuantity: '20' },
		{ itemName: 'example-item-b', period: '2', intendedBufferMonths: '', monthlyConsumption: '10', actualBufferQuantity: '20' },
	],
};
