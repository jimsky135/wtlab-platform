// Arrival Quick CSV template. Column ids MUST equal the quick schema
// field ids (tested) — one contract for blank template, manual export,
// and re-upload.

import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const arrivalQuickTemplate: CsvTemplateDefinition = {
	templateId: 'arrival-collision-quick-input',
	instrumentId: 'arrival-collision-detector',
	modeId: 'quick',
	version: '1',
	filename: 'arrival-collision-quick-input.csv',
	description: 'One row per arrival batch. Dates are ISO (YYYY-MM-DD). Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'arrivalDate', required: true, sample: '2026-08-10' },
		{ id: 'quantity', required: true, sample: '500' },
		{ id: 'container', required: false, sample: 'C-01' },
		{ id: 'supplier', required: false, sample: 'supplier-a' },
	],
	sampleRows: [
		{ arrivalDate: '2026-08-10', quantity: '500', container: 'C-01', supplier: 'supplier-a' },
		{ arrivalDate: '2026-08-24', quantity: '400', container: 'C-02', supplier: 'supplier-b' },
		{ arrivalDate: '2026-09-05', quantity: '150', container: 'C-03', supplier: 'supplier-a' },
	],
};
