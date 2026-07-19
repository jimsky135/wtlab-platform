// Export serialization for Lead Time Gap Checker results. Pure functions,
// unit-tested separately from the UI. Result-only headers (deliberately
// NOT the input schema ids) so a result file can never be re-mapped as an
// input CSV — same convention as every other production instrument.

import { buildCsv } from '../../platform/templates/generate-csv-template.ts';
import type { LeadTimeGapProjectionResult } from './modes/advanced/types.ts';
import type { LeadTimeGapOutput } from './types.ts';

const NOT_APPLICABLE = 'n/a';

/** Quick-mode result CSV: one row per checked item. */
export function leadTimeGapQuickResultsToCsv(
	results: ReadonlyArray<{ itemName: string; output: LeadTimeGapOutput }>
): string {
	const header = [
		'item',
		'coverageMonths',
		'estimatedDepletionDate',
		'bufferFloorDate',
		'expectedArrivalDate',
		'gap',
		'gapDurationDays',
		'risk',
		'reasonCodes',
	];
	const rows = results.map(({ itemName, output }) => [
		itemName,
		output.coverageMonths === undefined ? NOT_APPLICABLE : String(output.coverageMonths),
		output.estimatedDepletionDate ?? NOT_APPLICABLE,
		output.bufferFloorDate ?? NOT_APPLICABLE,
		output.expectedArrivalDate,
		output.gap ? 'yes' : 'no',
		output.gapDurationDays === undefined ? NOT_APPLICABLE : String(output.gapDurationDays),
		output.risk,
		output.reasonCodes.join('|'),
	]);
	return buildCsv([header, ...rows]);
}

/** Advanced-mode result CSV: one row per item-period plus gap/risk flags. */
export function leadTimeGapProjectionToCsv(result: LeadTimeGapProjectionResult): string {
	const header = [
		'item',
		'periodNumber',
		'arrivals',
		'consumed',
		'endingBalance',
		'belowBuffer',
		'shortage',
		'expectedArrivalPeriod',
		'gapWindow',
		'itemRiskLevel',
	];
	const rows = result.items.flatMap((item) =>
		item.periods.map((period) => [
			item.name,
			String(period.period),
			String(period.arrivalQuantity),
			String(period.consumption),
			String(period.endingBalance),
			period.belowBuffer ? 'yes' : 'no',
			period.shortage ? 'yes' : 'no',
			item.expectedArrivalPeriod === undefined ? NOT_APPLICABLE : String(item.expectedArrivalPeriod),
			item.gapWindow ? 'yes' : 'no',
			item.riskLevel,
		])
	);
	return buildCsv([header, ...rows]);
}
