// Quick adapter: confirmed quick-mode intake rows → the instrument's
// existing raw input shape. Time values in the CSV contract are already
// months, so units are fixed to 'month'. The instrument's own validate
// stays authoritative — this adapter emits RAW input, it never
// pre-validates business rules.

import type { LeadTimeGapRawInput } from '../../../tools/lead-time-gap-checker/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome, LeadTimeGapQuickAdapterItem } from './types.ts';

function asString(value: string | number | undefined): string {
	return value === undefined ? '' : String(value);
}

export function leadTimeGapQuickAdapter(confirmed: ConfirmedIntake): AdapterOutcome<LeadTimeGapQuickAdapterItem[]> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}

	const items: LeadTimeGapQuickAdapterItem[] = confirmed.records.map((record) => {
		const input: LeadTimeGapRawInput = {
			currentStock: asString(record['currentStock']),
			monthlyConsumption: asString(record['monthlyConsumption']),
			leadTime: asString(record['leadTimeMonths']),
			leadTimeUnit: 'month',
			safetyBuffer: asString(record['safetyBufferMonths']),
			safetyBufferUnit: 'month',
			currentDate: asString(record['currentDate']),
		};
		return { itemName: asString(record['itemName']) || 'item', input };
	});

	return { ok: true, data: items };
}
