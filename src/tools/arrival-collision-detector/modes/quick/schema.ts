// Arrival Quick Check intake schema — one row per arrival batch.
// Dates are strict ISO 'YYYY-MM-DD' (validated here, never inferred).

import type { IntakeIssue, IntakeSchema, NormalizedIntakeRecord } from '../../../../platform/intake/types.ts';

const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isoDateIssues(record: NormalizedIntakeRecord): IntakeIssue[] {
	const value = record.fields['arrivalDate']?.value;
	if (typeof value === 'string' && !ISO_DATE.test(value)) {
		return [
			{
				severity: 'error',
				message: `Arrival Date must be an ISO date (YYYY-MM-DD), got "${value}".`,
				code: 'ARRIVAL_DATE_INVALID_ISO',
				params: { value },
				field: 'arrivalDate',
			},
		];
	}
	return [];
}

export const arrivalQuickSchema: IntakeSchema = {
	id: 'arrival-collision-quick',
	title: 'Arrival Collision Quick Check',
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
	],
	validateRecord: isoDateIssues,
};
