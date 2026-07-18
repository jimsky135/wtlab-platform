// Dead Stock Quick Check intake schema — one item. Optional fields are
// explicitly surfaced as warnings, never silently defaulted: missing
// future demand means "unknown" (blocks a dead-stock verdict), missing
// unit cost means exposure value cannot be estimated, and a blank
// threshold falls back to the documented defaults.

import { DEFAULT_THRESHOLDS } from '../../types.ts';
import type { IntakeIssue, IntakeSchema, NormalizedIntakeRecord } from '../../../../platform/intake/types.ts';

export function deadStockWarnings(record: NormalizedIntakeRecord): IntakeIssue[] {
	const issues: IntakeIssue[] = [];
	if (record.fields['recentMonthlyConsumption']?.value === 0) {
		issues.push({
			severity: 'warning',
			message: 'No recent consumption — item will be assessed as dormant/dead-stock candidate.',
			code: 'DEAD_STOCK_NO_RECENT_CONSUMPTION_WARNING',
			field: 'recentMonthlyConsumption',
		});
	}
	if (record.fields['futureDemand']?.value === undefined) {
		issues.push({
			severity: 'warning',
			message: 'Future demand unknown — a dead-stock verdict will be withheld (dormant at most).',
			code: 'DEAD_STOCK_FUTURE_DEMAND_UNKNOWN_WARNING',
			field: 'futureDemand',
		});
	}
	if (record.fields['unitCost']?.value === undefined) {
		issues.push({
			severity: 'warning',
			message: 'Unit cost missing — exposure value cannot be estimated for this item.',
			code: 'DEAD_STOCK_UNIT_COST_MISSING_WARNING',
			field: 'unitCost',
		});
	}
	return issues;
}

export const deadStockQuickSchema: IntakeSchema = {
	id: 'dead-stock-quick',
	title: 'Dead Stock Quick Check',
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
			description: 'How many months since the item last moved. Blank = unknown.',
			type: 'number',
			required: false,
			min: 0,
		},
		{
			id: 'futureDemand',
			label: 'Known Future Demand',
			description: 'Confirmed future demand quantity. 0 = explicitly none; blank = unknown.',
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
			id: 'thresholdMonths',
			label: 'Coverage Threshold (months)',
			description: 'Optional override for the high-coverage threshold. Blank = default (12).',
			type: 'number',
			required: false,
			min: 1,
		},
	],
	validateRecord: (record) => {
		const issues = deadStockWarnings(record);
		if (record.fields['thresholdMonths']?.value === undefined) {
			issues.push({
				severity: 'warning',
				message: `Default thresholds used (high coverage ${DEFAULT_THRESHOLDS.highCoverageMonths} months, excess ${DEFAULT_THRESHOLDS.excessCoverageMonths}, dormant ${DEFAULT_THRESHOLDS.dormantMonths}, dead ${DEFAULT_THRESHOLDS.deadMonths}).`,
				code: 'DEAD_STOCK_DEFAULT_THRESHOLDS_USED',
				params: {
					high: DEFAULT_THRESHOLDS.highCoverageMonths,
					excess: DEFAULT_THRESHOLDS.excessCoverageMonths,
					dormant: DEFAULT_THRESHOLDS.dormantMonths,
					dead: DEFAULT_THRESHOLDS.deadMonths,
				},
				field: 'thresholdMonths',
			});
		}
		return issues;
	},
};
