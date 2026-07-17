// Export serialization for Water Level Checker results. Pure functions,
// separate from the UI so they can be unit-tested. The calculation core
// stays untouched — these only format existing outputs.
//
// Naming rule: result files are named water-level-*-result.csv and use
// result-specific headers, so they can never be mistaken for (or mapped
// as) reusable input CSVs.

import { buildCsv } from '../../platform/templates/generate-csv-template.ts';
import type { ProjectionResult } from './modes/advanced/types.ts';
import type { InventoryBufferOutput } from './types.ts';

const NOT_PROVIDED = 'not-provided';

function rows(output: InventoryBufferOutput): Array<[string, string]> {
	return [
		['currentCoverageMonths', String(output.currentCoverageMonths)],
		['totalCoverageMonths', output.totalCoverageMonths === undefined ? NOT_PROVIDED : String(output.totalCoverageMonths)],
		['minimumSafetyStock', String(output.minimumSafetyStock)],
		['reorderPoint', String(output.reorderPoint)],
		['arrivalRisk', output.arrivalRisk],
		['riskStatus', output.riskStatus],
	];
}

/** Two-column CSV (`field,value`) with a header row. */
export function outputToCsv(output: InventoryBufferOutput): string {
	const lines = [['field', 'value'], ...rows(output)];
	return lines.map((line) => line.join(',')).join('\n');
}

/** Quick-mode result CSV: one row per checked item. Result headers only. */
export function quickResultsToCsv(results: ReadonlyArray<{ itemName: string; output: InventoryBufferOutput }>): string {
	// Result-only header names (deliberately NOT the input schema ids, so
	// a result file can never exact-match back onto the input contract).
	const header = [
		'item',
		'currentCoverageMonths',
		'totalCoverageMonths',
		'minimumSafetyStock',
		'reorderPoint',
		'arrivalRisk',
		'riskStatus',
	];
	const rows = results.map(({ itemName, output }) => [
		itemName,
		String(output.currentCoverageMonths),
		output.totalCoverageMonths === undefined ? NOT_PROVIDED : String(output.totalCoverageMonths),
		String(output.minimumSafetyStock),
		String(output.reorderPoint),
		output.arrivalRisk,
		output.riskStatus,
	]);
	return buildCsv([header, ...rows]);
}

/** Advanced-mode result CSV: one row per item-period plus risk flags. */
export function projectionToCsv(result: ProjectionResult): string {
	// Result-only header names — see quickResultsToCsv note.
	const header = ['item', 'periodNumber', 'arrivals', 'consumed', 'endingBalance', 'belowBuffer', 'shortage', 'itemRiskLevel'];
	const rows = result.items.flatMap((item) =>
		item.periods.map((period) => [
			item.name,
			String(period.period),
			String(period.arrivalQuantity),
			String(period.consumption),
			String(period.endingBalance),
			period.belowBuffer ? 'yes' : 'no',
			period.shortage ? 'yes' : 'no',
			item.riskLevel,
		])
	);
	return buildCsv([header, ...rows]);
}

/** JSON document with tool identity so re-import can recognize it later. */
export function outputToJson(output: InventoryBufferOutput): string {
	return JSON.stringify(
		{
			tool: 'inventory-buffer-check',
			version: '0.2',
			output: {
				...output,
				// JSON has no undefined; make "not provided" explicit instead
				// of silently dropping the field.
				totalCoverageMonths: output.totalCoverageMonths ?? null,
			},
		},
		null,
		2
	);
}
