// Buffer Drift Quick Check intake schema — one row per item. No unit
// toggle and no custom validateRecord this time (unlike the other three
// instruments) — every field is a plain required number, the simplest
// case the Quick Form Generator handles.

import type { IntakeSchema } from '../../../../platform/intake/types.ts';

export const bufferDriftQuickSchema: IntakeSchema = {
	id: 'buffer-drift-quick',
	title: 'Buffer Drift Quick Check',
	fields: [
		{
			id: 'itemName',
			label: 'Item Name',
			description: 'SKU or name identifying the item.',
			type: 'text',
			required: false,
		},
		{
			id: 'monthlyConsumption',
			label: 'Monthly Consumption',
			description: 'Average monthly usage. Used to convert buffer quantity to months.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'intendedBufferMonths',
			label: 'Intended Buffer (months)',
			description: 'The safety-buffer policy target, in months of average consumption.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'actualBufferQuantity',
			label: 'Actual Buffer Quantity',
			description: 'The buffer stock actually being held, in quantity units.',
			type: 'number',
			required: true,
			min: 0,
		},
	],
};
