// Quick Check CSV template. Column ids MUST equal the quick intake
// schema field ids — the blank template, the manual-input export, and
// the re-upload contract are one and the same (tested).

import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const bufferDriftQuickTemplate: CsvTemplateDefinition = {
	templateId: 'buffer-drift-quick-input',
	instrumentId: 'buffer-drift-monitor',
	modeId: 'quick',
	version: '1',
	filename: 'buffer-drift-quick-input.csv',
	description: 'One row per item. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'itemName', required: false, sample: 'example-item' },
		{ id: 'monthlyConsumption', required: true, sample: '20' },
		{ id: 'intendedBufferMonths', required: true, sample: '1' },
		{ id: 'actualBufferQuantity', required: true, sample: '14' },
	],
};
