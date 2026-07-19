// Advanced Planning intake schema — long format: one row per item per
// period, same convention as every other instrument's advanced schema.
// Intended buffer is item-level, supplied on the item's first row;
// consumption and actual buffer quantity are observed per period.

import type { IntakeSchema } from '../../../../platform/intake/types.ts';

export const bufferDriftAdvancedSchema: IntakeSchema = {
	id: 'buffer-drift-advanced',
	title: 'Buffer Drift Advanced Tracking',
	fields: [
		{
			id: 'itemName',
			label: 'Item Name',
			description: 'SKU or name identifying the item. Repeats on every period row.',
			type: 'text',
			required: true,
		},
		{
			id: 'period',
			label: 'Period',
			description: 'Sequence number of the period (1, 2, 3 …).',
			type: 'number',
			required: true,
			min: 1,
		},
		{
			id: 'intendedBufferMonths',
			label: 'Intended Buffer (months)',
			description: 'Item-level policy target. Fill on the item’s first row.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'monthlyConsumption',
			label: 'Monthly Consumption',
			description: 'Observed average monthly usage for this period.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'actualBufferQuantity',
			label: 'Actual Buffer Quantity',
			description: 'Observed buffer stock held during this period.',
			type: 'number',
			required: true,
			min: 0,
		},
	],
};
