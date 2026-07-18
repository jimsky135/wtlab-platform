// Dead Stock Advanced Scan intake schema — one row per SKU. Same
// warning policy as quick (missing optional data is surfaced, never
// silently defaulted). Thresholds use the documented defaults; a
// per-file threshold column is deliberately not part of v0.1.

import type { IntakeSchema } from '../../../../platform/intake/types.ts';
import { deadStockWarnings } from '../quick/schema.ts';

export const deadStockAdvancedSchema: IntakeSchema = {
	id: 'dead-stock-advanced',
	title: 'Dead Stock Advanced Scan',
	fields: [
		{
			id: 'item',
			label: 'Item Name',
			description: 'SKU or name identifying the item.',
			type: 'text',
			required: true,
		},
		{
			id: 'currentStock',
			label: 'Current Stock',
			description: 'On-hand quantity.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'recentMonthlyConsumption',
			label: 'Recent Monthly Consumption',
			description: 'Average recent monthly usage. 0 means no recent consumption.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'monthsSinceLastMovement',
			label: 'Months Since Last Movement',
			description: 'Blank = unknown.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'futureDemand',
			label: 'Known Future Demand',
			description: '0 = explicitly none; blank = unknown.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'unitCost',
			label: 'Unit Cost',
			description: 'Optional — enables exposure value estimation.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'category',
			label: 'Category',
			description: 'Optional grouping label. Not interpreted by the engine in v0.1.',
			type: 'text',
			required: false,
		},
		{
			id: 'note',
			label: 'Note',
			description: 'Optional free text.',
			type: 'text',
			required: false,
		},
	],
	validateRecord: deadStockWarnings,
};
