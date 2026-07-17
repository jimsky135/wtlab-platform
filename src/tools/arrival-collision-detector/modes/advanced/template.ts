// Arrival Advanced CSV template — quick columns plus first-row
// monthlyCapacity.

import type { CsvTemplateDefinition } from '../../../../platform/templates/types.ts';

export const arrivalAdvancedTemplate: CsvTemplateDefinition = {
	templateId: 'arrival-collision-advanced-input',
	instrumentId: 'arrival-collision-detector',
	modeId: 'advanced',
	version: '1',
	filename: 'arrival-collision-advanced-input.csv',
	description:
		'One row per arrival batch, ISO dates. Monthly capacity goes on the first row. Reusable: download, edit, re-upload.',
	columns: [
		{ id: 'arrivalDate', required: true, sample: '2026-08-10' },
		{ id: 'quantity', required: true, sample: '500' },
		{ id: 'container', required: false, sample: 'C-01' },
		{ id: 'supplier', required: false, sample: 'supplier-a' },
		{ id: 'monthlyCapacity', required: false, sample: '1200' },
	],
	sampleRows: [
		{ arrivalDate: '2026-08-10', quantity: '500', container: 'C-01', supplier: 'supplier-a', monthlyCapacity: '1200' },
		{ arrivalDate: '2026-08-18', quantity: '450', container: 'C-02', supplier: 'supplier-b', monthlyCapacity: '' },
		{ arrivalDate: '2026-08-24', quantity: '400', container: 'C-03', supplier: 'supplier-c', monthlyCapacity: '' },
		{ arrivalDate: '2026-09-12', quantity: '300', container: 'C-04', supplier: 'supplier-a', monthlyCapacity: '' },
	],
};
