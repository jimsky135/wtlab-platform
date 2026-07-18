// Dead Stock quick adapter: confirmed intake rows → the instrument's
// analysis input. Pure structure/type conversion; the only "default" is
// wiring the documented DEFAULT_THRESHOLDS (with the declared quick-mode
// thresholdMonths override). No classification logic here.

import { DEFAULT_THRESHOLDS, type DeadStockAnalysisInput, type DeadStockItemInput } from '../../../tools/dead-stock-scanner/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome } from '../types.ts';

function asOptionalNumber(value: string | number | undefined): number | undefined {
	return typeof value === 'number' ? value : undefined;
}

function asOptionalString(value: string | number | undefined): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

export function toDeadStockItems(records: ConfirmedIntake['records']): DeadStockItemInput[] {
	return records.map((record) => ({
		item: typeof record['item'] === 'string' ? record['item'] : String(record['item'] ?? ''),
		currentStock: typeof record['currentStock'] === 'number' ? record['currentStock'] : Number.NaN,
		recentMonthlyConsumption:
			typeof record['recentMonthlyConsumption'] === 'number' ? record['recentMonthlyConsumption'] : Number.NaN,
		monthsSinceLastMovement: asOptionalNumber(record['monthsSinceLastMovement']),
		futureDemand: asOptionalNumber(record['futureDemand']),
		unitCost: asOptionalNumber(record['unitCost']),
		category: asOptionalString(record['category']),
	}));
}

export function deadStockQuickAdapter(confirmed: ConfirmedIntake): AdapterOutcome<DeadStockAnalysisInput> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}
	const thresholdOverride = confirmed.records
		.map((record) => record['thresholdMonths'])
		.find((value): value is number => typeof value === 'number');

	const thresholds =
		thresholdOverride !== undefined
			? { ...DEFAULT_THRESHOLDS, highCoverageMonths: thresholdOverride, excessCoverageMonths: thresholdOverride * 2 }
			: DEFAULT_THRESHOLDS;

	return { ok: true, data: { items: toDeadStockItems(confirmed.records), thresholds } };
}
