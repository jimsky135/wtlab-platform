// Quick Check CSV template. Column ids MUST equal the quick intake
// schema field ids — the blank template, the manual-input export, and
// the re-upload contract are one and the same (tested).

import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const quickCsvTemplate: CsvTemplateDefinition = {
	templateId: 'water-level-quick-input',
	instrumentId: 'inventory-buffer-check',
	modeId: 'quick',
	version: '1',
	filename: 'water-level-quick-input.csv',
	description: 'One row per item. All time values are months. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'itemName', required: true, sample: 'example-item' },
		{ id: 'currentStock', required: true, sample: '120' },
		{ id: 'monthlyConsumption', required: true, sample: '15' },
		{ id: 'leadTimeMonths', required: false, sample: '2' },
		{ id: 'safetyBufferMonths', required: false, sample: '1' },
		{ id: 'inTransitQuantity', required: false, sample: '' },
		{ id: 'arrivalTimeMonths', required: false, sample: '' },
	],
};
