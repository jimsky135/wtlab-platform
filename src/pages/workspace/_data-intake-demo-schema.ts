// Demonstration schema for the Data Intake workspace page. This is demo
// content, deliberately kept out of the shared intake modules — shared
// intake code must stay instrument-agnostic. The zero-quantity warning
// below is a demonstration rule (it shows warning behavior), not a
// platform business rule.

import type { IntakeSchema } from '../../platform/intake/types.ts';

export const demoIntakeSchema: IntakeSchema = {
	id: 'data-intake-demo',
	title: 'Item List (Demonstration)',
	fields: [
		{
			id: 'itemName',
			label: 'Item Name',
			description: 'A name or code identifying the item.',
			type: 'text',
			required: true,
		},
		{
			id: 'quantity',
			label: 'Quantity',
			description: 'A non-negative number.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'unit',
			label: 'Unit',
			description: 'Optional unit label (e.g. kg, pcs). Not converted or interpreted.',
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
	validateRecord: (record) =>
		record.fields['quantity']?.value === 0
			? [
					{
						severity: 'warning',
						message: 'Quantity is zero — confirm this is intended.',
						field: 'quantity',
					},
				]
			: [],
};
