// Advanced adapter: confirmed long-format rows (one per item-period) →
// the instrument's AdvancedPlanningInput. Pure structure conversion:
// grouping by item, sorting periods, lifting item-level values from the
// first row that declares them. Structural problems (duplicate periods,
// no beginning inventory anywhere for an item) are reported as issues —
// projection math itself lives in the instrument.

import type { AdvancedPlanningInput, PlanningItem } from '../../../tools/inventory-buffer-check/modes/advanced/types.ts';
import type { ConfirmedIntake, IntakeIssue } from '../../intake/types.ts';
import type { AdapterOutcome } from './types.ts';

function asNumber(value: string | number | undefined): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

export function advancedAdapter(confirmed: ConfirmedIntake): AdapterOutcome<AdvancedPlanningInput> {
	const issues: IntakeIssue[] = [];

	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.' }] };
	}

	const byItem = new Map<string, PlanningItem & { seenPeriods: Set<number> }>();

	confirmed.records.forEach((record, row) => {
		const name = typeof record['itemName'] === 'string' ? record['itemName'] : String(record['itemName'] ?? '');
		const period = asNumber(record['period']);
		if (name === '' || period === undefined) {
			issues.push({
				severity: 'error',
				message: 'Row is missing an item name or period and cannot be structured.',
				row,
			});
			return;
		}

		let item = byItem.get(name);
		if (!item) {
			item = {
				name,
				beginningInventory: Number.NaN,
				safetyBufferMonths: undefined,
				periods: [],
				seenPeriods: new Set<number>(),
			};
			byItem.set(name, item);
		}

		if (item.seenPeriods.has(period)) {
			issues.push({
				severity: 'error',
				message: `Item "${name}" has more than one row for period ${period}.`,
				field: 'period',
				row,
			});
			return;
		}
		item.seenPeriods.add(period);

		const beginning = asNumber(record['beginningInventory']);
		if (beginning !== undefined && Number.isNaN(item.beginningInventory)) {
			item.beginningInventory = beginning;
		}
		const buffer = asNumber(record['safetyBufferMonths']);
		if (buffer !== undefined && item.safetyBufferMonths === undefined) {
			item.safetyBufferMonths = buffer;
		}

		item.periods.push({
			period,
			consumption: asNumber(record['consumption']) ?? 0,
			arrivalQuantity: asNumber(record['arrivalQuantity']) ?? 0,
		});
	});

	for (const item of byItem.values()) {
		if (Number.isNaN(item.beginningInventory)) {
			issues.push({
				severity: 'error',
				message: `Item "${item.name}" has no beginning inventory on any of its rows.`,
				field: 'beginningInventory',
			});
		}
	}

	if (issues.some((issue) => issue.severity === 'error')) {
		return { ok: false, issues };
	}

	return {
		ok: true,
		data: {
			items: Array.from(byItem.values()).map(({ seenPeriods: _seen, ...item }) => ({
				...item,
				periods: [...item.periods].sort((a, b) => a.period - b.period),
			})),
		},
	};
}
