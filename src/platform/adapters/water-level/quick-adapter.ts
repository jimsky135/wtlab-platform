// Quick adapter: confirmed quick-mode intake rows → the instrument's
// existing raw input shape. Time values in the CSV contract are already
// months, so units are fixed to 'month'. Blank lead time / safety
// buffer become the declared default of 0 (surfaced as a warning during
// intake validation). The instrument's own validate stays authoritative
// — this adapter emits RAW input, it never pre-validates business rules.

import type { InventoryBufferRawInput } from '../../../tools/inventory-buffer-check/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome, QuickAdapterItem } from './types.ts';

function asString(value: string | number | undefined): string | undefined {
	return value === undefined ? undefined : String(value);
}

export function quickAdapter(confirmed: ConfirmedIntake): AdapterOutcome<QuickAdapterItem[]> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}

	const items: QuickAdapterItem[] = confirmed.records.map((record) => {
		const input: InventoryBufferRawInput = {
			currentStock: asString(record['currentStock']) ?? '',
			monthlyConsumption: asString(record['monthlyConsumption']) ?? '',
			leadTime: asString(record['leadTimeMonths']) ?? '0',
			leadTimeUnit: 'month',
			safetyBuffer: asString(record['safetyBufferMonths']) ?? '0',
			safetyBufferUnit: 'month',
			inTransitQuantity: asString(record['inTransitQuantity']),
			arrivalTime: asString(record['arrivalTimeMonths']),
			arrivalTimeUnit: 'month',
		};
		return { itemName: asString(record['itemName']) ?? 'item', input };
	});

	return { ok: true, data: items };
}
