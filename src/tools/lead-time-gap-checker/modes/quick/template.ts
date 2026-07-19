// Quick Check CSV template. Column ids MUST equal the quick intake
// schema field ids — the blank template, the manual-input export, and
// the re-upload contract are one and the same (tested).

import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const leadTimeGapQuickTemplate: CsvTemplateDefinition = {
	templateId: 'lead-time-gap-quick-input',
	instrumentId: 'lead-time-gap-checker',
	modeId: 'quick',
	version: '1',
	filename: 'lead-time-gap-quick-input.csv',
	description: 'One row per item. Lead time and buffer are months. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'itemName', required: false, sample: 'example-item' },
		{ id: 'currentStock', required: true, sample: '120' },
		{ id: 'monthlyConsumption', required: true, sample: '20' },
		{ id: 'leadTimeMonths', required: true, sample: '1.5' },
		{ id: 'safetyBufferMonths', required: true, sample: '0.5' },
		{ id: 'currentDate', required: false, sample: '' },
	],
};
