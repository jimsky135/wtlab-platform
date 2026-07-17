// Arrival advanced adapter: same row conversion as quick, plus lifting
// the optional monthly capacity from the first row that declares it.

import type { ArrivalAnalysisInput } from '../../../tools/arrival-collision-detector/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome } from '../types.ts';
import { toArrivalRecords } from './quick-adapter.ts';

export function arrivalAdvancedAdapter(confirmed: ConfirmedIntake): AdapterOutcome<ArrivalAnalysisInput> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.' }] };
	}
	const capacityValue = confirmed.records
		.map((record) => record['monthlyCapacity'])
		.find((value): value is number => typeof value === 'number');

	return {
		ok: true,
		data: { arrivals: toArrivalRecords(confirmed.records), monthlyCapacity: capacityValue },
	};
}
