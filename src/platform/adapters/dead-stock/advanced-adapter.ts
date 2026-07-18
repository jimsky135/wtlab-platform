// Dead Stock advanced adapter: same row conversion; thresholds are the
// documented defaults (no per-file override column in v0.1).

import { DEFAULT_THRESHOLDS, type DeadStockAnalysisInput } from '../../../tools/dead-stock-scanner/types.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import type { AdapterOutcome } from '../types.ts';
import { toDeadStockItems } from './quick-adapter.ts';

export function deadStockAdvancedAdapter(confirmed: ConfirmedIntake): AdapterOutcome<DeadStockAnalysisInput> {
	if (confirmed.records.length === 0) {
		return { ok: false, issues: [{ severity: 'error', message: 'No confirmed rows to run.', code: 'NO_CONFIRMED_ROWS' }] };
	}
	return { ok: true, data: { items: toDeadStockItems(confirmed.records), thresholds: DEFAULT_THRESHOLDS } };
}
