// Advanced Planning intake schema — long format: one row per item per
// period. Periods are plain sequence numbers (1, 2, 3 …), never dates —
// no date/locale inference. Beginning inventory and safety buffer are
// item-level values supplied on the item's first row.

import type { IntakeSchema } from '../../../../platform/intake/types.ts';

export const advancedIntakeSchema: IntakeSchema = {
	id: 'water-level-advanced',
	title: 'Water Level Advanced Planning',
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
			description: 'Sequence number of the period (1, 2, 3 …). Month or quarter — your choice, kept consistent.',
			type: 'number',
			required: true,
			min: 1,
		},
		{
			id: 'beginningInventory',
			label: 'Beginning Inventory',
			description: 'Item-level starting stock. Fill on the item’s first row.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'safetyBufferMonths',
			label: 'Safety Buffer (months)',
			description: 'Item-level buffer in months of average consumption. Fill on the item’s first row.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'consumption',
			label: 'Consumption',
			description: 'Planned or forecast consumption for this period.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'arrivalQuantity',
			label: 'Arrival Quantity',
			description: 'Scheduled arrival quantity landing in this period.',
			type: 'number',
			required: false,
			min: 0,
		},
	],
};
