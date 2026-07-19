// Quick adapter: confirmed quick-mode intake rows → the instrument's
// existing raw input shape. The instrument's own validate stays
// authoritative — this adapter emits RAW input, it never pre-validates
// business rules.

import type { BufferDriftRawInput } from '../../../tools/buffer-drift-monitor/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome, BufferDriftQuickAdapterItem } from './types.ts';

function asString(value: string | number | undefined): string {
	return value === undefined ? '' : String(value);
}

export function bufferDriftQuickAdapter(confirmed: ConfirmedIntake): AdapterOutcome<BufferDriftQuickAdapterItem[]> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}

	const items: BufferDriftQuickAdapterItem[] = confirmed.records.map((record) => {
		const input: BufferDriftRawInput = {
			monthlyConsumption: asString(record['monthlyConsumption']),
			intendedBufferMonths: asString(record['intendedBufferMonths']),
			actualBufferQuantity: asString(record['actualBufferQuantity']),
		};
		return { itemName: asString(record['itemName']) || 'item', input };
	});

	return { ok: true, data: items };
}
