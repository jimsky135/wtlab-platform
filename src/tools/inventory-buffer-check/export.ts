// Export serialization for Water Level Checker results. Pure functions,
// separate from the UI so they can be unit-tested. The calculation core
// stays untouched — these only format an existing output.

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
