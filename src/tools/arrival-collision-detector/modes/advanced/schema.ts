// Arrival Advanced Planning intake schema — same batch rows as quick,
// plus an optional item-level monthly warehouse capacity on the first
// row (same first-row convention as Water Level advanced).

import type { IntakeSchema } from '../../../../platform/intake/types.ts';
import { isoDateIssues } from '../quick/schema.ts';

export const arrivalAdvancedSchema: IntakeSchema = {
	id: 'arrival-collision-advanced',
	title: 'Arrival Collision Advanced Planning',
	fields: [
		{
			id: 'arrivalDate',
			label: 'Arrival Date',
			description: 'Expected arrival date, ISO format: YYYY-MM-DD.',
			type: 'text',
			required: true,
		},
		{
			id: 'quantity',
			label: 'Quantity',
			description: 'Arriving quantity for this batch.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'container',
			label: 'Container',
			description: 'Optional container / shipment label.',
			type: 'text',
			required: false,
		},
		{
			id: 'supplier',
			label: 'Supplier',
			description: 'Optional supplier label.',
			type: 'text',
			required: false,
		},
		{
			id: 'monthlyCapacity',
			label: 'Monthly Capacity',
			description: 'Optional warehouse intake capacity per month. Fill on the first row.',
			type: 'number',
			required: false,
			min: 0,
		},
	],
	validateRecord: isoDateIssues,
};
