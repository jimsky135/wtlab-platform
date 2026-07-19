// Export serialization for Buffer Drift Monitor results. Pure functions,
// unit-tested separately from the UI. Result-only headers so a result
// file can never be re-mapped as an input CSV — same convention as every
// other production instrument.

import { buildCsv } from '../../platform/templates/generate-csv-template.ts';
import type { BufferDriftProjectionResult } from './modes/advanced/types.ts';
import type { BufferDriftOutput } from './types.ts';

const NOT_APPLICABLE = 'n/a';

/** Quick-mode result CSV: one row per checked item. */
export function bufferDriftQuickResultsToCsv(
	results: ReadonlyArray<{ itemName: string; output: BufferDriftOutput }>
): string {
	const header = [
		'item',
		'intendedBufferQuantity',
		'actualBufferMonths',
		'driftMonths',
		'driftQuantity',
		'driftPercent',
		'status',
		'reasonCodes',
	];
	const rows = results.map(({ itemName, output }) => [
		itemName,
		String(output.intendedBufferQuantity),
		output.actualBufferMonths === undefined ? NOT_APPLICABLE : String(output.actualBufferMonths),
		output.driftMonths === undefined ? NOT_APPLICABLE : String(output.driftMonths),
		String(output.driftQuantity),
		output.driftPercent === undefined ? NOT_APPLICABLE : String(output.driftPercent),
		output.status,
		output.reasonCodes.join('|'),
	]);
	return buildCsv([header, ...rows]);
}

/** Advanced-mode result CSV: one row per item-period plus trend. */
export function bufferDriftProjectionToCsv(result: BufferDriftProjectionResult): string {
	const header = ['item', 'periodNumber', 'monthlyConsumption', 'actualBufferQuantity', 'driftPercent', 'status', 'trend'];
	const rows = result.items.flatMap((item) =>
		item.periods.map((period) => [
			item.name,
			String(period.period),
			String(period.monthlyConsumption),
			String(period.actualBufferQuantity),
			period.driftPercent === undefined ? NOT_APPLICABLE : String(period.driftPercent),
			period.status,
			item.trend,
		])
	);
	return buildCsv([header, ...rows]);
}
