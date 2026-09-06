// Adapter: confirmed intake rows → the instrument's raw input shape. The
// instrument's own validate stays authoritative — this adapter emits RAW
// input, it never pre-validates business rules.
//
// A window missing from the confirmed record stays an empty string here,
// which is exactly how the engine's validator reads "no data for this
// window". The adapter never substitutes a 0.
//
// Single adapter rather than quick/advanced: this instrument has one
// entry method (see the note in the tool's schema.ts).

import { DEMAND_WINDOW_IDS, type DemandWaveRawInput } from '../../../tools/demand-wave-radar/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome, DemandWaveAdapterItem } from './types.ts';

function asString(value: string | number | undefined): string {
	return value === undefined ? '' : String(value);
}

export function demandWaveAdapter(confirmed: ConfirmedIntake): AdapterOutcome<DemandWaveAdapterItem[]> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}

	const items: DemandWaveAdapterItem[] = confirmed.records.map((record) => {
		const input = Object.fromEntries(
			DEMAND_WINDOW_IDS.map((window) => [window, asString(record[window])])
		) as DemandWaveRawInput;
		return { itemName: asString(record['itemName']) || 'item', input };
	});

	return { ok: true, data: items };
}
