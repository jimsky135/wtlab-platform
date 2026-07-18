// Arrival quick adapter: confirmed intake rows → ArrivalAnalysisInput.
// Pure structure conversion: ISO date (already schema-validated) →
// month key, numbers pass through. No collision rules, no thresholds.

import type { ArrivalAnalysisInput, ArrivalRecord } from '../../../tools/arrival-collision-detector/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome } from '../types.ts';

function asOptionalString(value: string | number | undefined): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

export function toArrivalRecords(records: ConfirmedIntake['records']): ArrivalRecord[] {
	return records.map((record) => ({
		monthKey: String(record['arrivalDate'] ?? '').slice(0, 7),
		quantity: typeof record['quantity'] === 'number' ? record['quantity'] : 0,
		container: asOptionalString(record['container']),
		supplier: asOptionalString(record['supplier']),
	}));
}

export function arrivalQuickAdapter(confirmed: ConfirmedIntake): AdapterOutcome<ArrivalAnalysisInput> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}
	return { ok: true, data: { arrivals: toArrivalRecords(confirmed.records), monthlyCapacity: undefined } };
}
