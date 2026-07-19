// Advanced adapter: confirmed long-format rows (one per item-period) →
// the instrument's BufferDriftAdvancedInput. Pure structure conversion:
// grouping by item, sorting periods, lifting the item-level intended
// buffer from the first row that declares it. Reuses the same structural
// message codes as the other instruments' advanced adapters where the
// situation is identical (row missing item/period, duplicate period).

import type { BufferDriftAdvancedInput, BufferDriftPlanningItem } from '../../../tools/buffer-drift-monitor/modes/advanced/types.ts';
import type { ConfirmedIntake, IntakeIssue } from '../../intake/types.ts';
import type { AdapterOutcome } from '../types.ts';

function asNumber(value: string | number | undefined): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

export function bufferDriftAdvancedAdapter(confirmed: ConfirmedIntake): AdapterOutcome<BufferDriftAdvancedInput> {
	const issues: IntakeIssue[] = [];

	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}

	const byItem = new Map<
		string,
		Omit<BufferDriftPlanningItem, 'intendedBufferMonths'> & { intendedBufferMonths: number | undefined; seenPeriods: Set<number> }
	>();

	confirmed.records.forEach((record, row) => {
		const name = typeof record['itemName'] === 'string' ? record['itemName'] : String(record['itemName'] ?? '');
		const period = asNumber(record['period']);
		if (name === '' || period === undefined) {
			issues.push({
				severity: 'error',
				message: 'Row is missing an item name or period and cannot be structured.',
				code: 'ROW_MISSING_ITEM_OR_PERIOD',
				row,
			});
			return;
		}

		let item = byItem.get(name);
		if (!item) {
			item = { name, intendedBufferMonths: undefined, periods: [], seenPeriods: new Set<number>() };
			byItem.set(name, item);
		}

		if (item.seenPeriods.has(period)) {
			issues.push({
				severity: 'error',
				message: `Item "${name}" has more than one row for period ${period}.`,
				code: 'DUPLICATE_PERIOD_FOR_ITEM',
				params: { name, period },
				field: 'period',
				row,
			});
			return;
		}
		item.seenPeriods.add(period);

		const intended = asNumber(record['intendedBufferMonths']);
		if (intended !== undefined && item.intendedBufferMonths === undefined) {
			item.intendedBufferMonths = intended;
		}

		item.periods.push({
			period,
			monthlyConsumption: asNumber(record['monthlyConsumption']) ?? 0,
			actualBufferQuantity: asNumber(record['actualBufferQuantity']) ?? 0,
		});
	});

	for (const item of byItem.values()) {
		if (item.intendedBufferMonths === undefined) {
			issues.push({
				severity: 'error',
				message: `Item "${item.name}" has no intended buffer declared on any of its rows.`,
				code: 'ITEM_MISSING_INTENDED_BUFFER',
				params: { name: item.name },
				field: 'intendedBufferMonths',
			});
		}
	}

	if (issues.some((issue) => issue.severity === 'error')) {
		return { ok: false, issues };
	}

	return {
		ok: true,
		data: {
			items: Array.from(byItem.values()).map(({ seenPeriods: _seen, intendedBufferMonths, ...item }) => ({
				...item,
				intendedBufferMonths: intendedBufferMonths as number,
				periods: [...item.periods].sort((a, b) => a.period - b.period),
			})),
		},
	};
}
