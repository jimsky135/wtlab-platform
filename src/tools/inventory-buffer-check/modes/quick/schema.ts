// Quick Check intake schema — single item per row, all time values in
// months (the CSV contract never carries a day/month unit column; the
// manual form converts day inputs to months before entering this
// schema). Requiredness here is the intake gate; the instrument's own
// validate stays authoritative for business rules (e.g. consumption > 0).

import type { IntakeSchema } from '../../../../platform/intake/types.ts';

export const quickIntakeSchema: IntakeSchema = {
	id: 'water-level-quick',
	title: 'Water Level Quick Check',
	fields: [
		{
			id: 'itemName',
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
			id: 'monthlyConsumption',
			label: 'Monthly Consumption',
			description: 'Average monthly usage. Must be greater than 0 to run.',
			type: 'number',
			required: true,
			min: 0,
		},
		{
			id: 'leadTimeMonths',
			label: 'Lead Time (months)',
			description: 'Replenishment lead time in months. Blank is treated as 0.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'safetyBufferMonths',
			label: 'Safety Buffer (months)',
			description: 'Safety buffer in months. Blank is treated as 0.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'inTransitQuantity',
			label: 'In-Transit Quantity',
			description: 'Quantity already ordered but not yet arrived.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'arrivalTimeMonths',
			label: 'Arrival Time (months)',
			description: 'Expected arrival of the in-transit quantity, in months from now.',
			type: 'number',
			required: false,
			min: 0,
		},
	],
	validateRecord: (record) => {
		const issues = [];
		if (record.fields['leadTimeMonths']?.value === undefined) {
			issues.push({
				severity: 'warning' as const,
				message: 'Lead Time is blank — it will be treated as 0 months.',
				field: 'leadTimeMonths',
			});
		}
		if (record.fields['safetyBufferMonths']?.value === undefined) {
			issues.push({
				severity: 'warning' as const,
				message: 'Safety Buffer is blank — it will be treated as 0 months.',
				field: 'safetyBufferMonths',
			});
		}
		return issues;
	},
};
