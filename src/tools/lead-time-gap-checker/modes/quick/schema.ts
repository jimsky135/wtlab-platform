// Lead Time Gap Quick Check intake schema — one row per item. Time values
// are always months (CSV contract convention, matches every other
// instrument — no unit columns, no unit guessing). `currentDate` is
// optional; blank defaults to today at the adapter boundary, surfaced
// here as an info issue rather than silently applied.

import type { IntakeIssue, IntakeSchema, NormalizedIntakeRecord } from '../../../../platform/intake/types.ts';

const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function currentDateIssues(record: NormalizedIntakeRecord): IntakeIssue[] {
	const value = record.fields['currentDate']?.value;
	if (value === undefined) {
		return [
			{
				severity: 'info',
				message: 'Current Date is blank — today will be used.',
				code: 'LEAD_TIME_CURRENT_DATE_DEFAULTED',
				field: 'currentDate',
			},
		];
	}
	if (typeof value === 'string' && !ISO_DATE.test(value)) {
		return [
			{
				severity: 'error',
				message: `Current Date must be an ISO date (YYYY-MM-DD), got "${value}".`,
				code: 'LEAD_TIME_CURRENT_DATE_INVALID_ISO',
				params: { value },
				field: 'currentDate',
			},
		];
	}
	return [];
}

export const leadTimeGapQuickSchema: IntakeSchema = {
	id: 'lead-time-gap-quick',
	title: 'Lead Time Gap Quick Check',
	fields: [
		{
			id: 'itemName',
			label: 'Item Name',
			description: 'SKU or name identifying the item.',
			type: 'text',
			required: false,
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
			id: 'monthlyConsumption',
			label: 'Monthly Consumption',
			description: 'Average monthly usage. 0 means the item never depletes.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'leadTimeMonths',
			label: 'Supplier Lead Time (months)',
			description: 'Time from placing an order to receiving it, in months.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'safetyBufferMonths',
			label: 'Safety Buffer (months)',
			description: 'Safety buffer in months of average consumption.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'currentDate',
			label: 'Current Date',
			description: 'ISO date (YYYY-MM-DD) to measure from. Blank means today.',
			type: 'text',
			required: false,
		},
	],
	validateRecord: currentDateIssues,
};
