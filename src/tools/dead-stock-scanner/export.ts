// Result export. Result-only headers — 'currentStock' and consumption
// columns are deliberately absent so a result file can never satisfy the
// input template's required mapping.

import { buildCsv } from '../../platform/templates/generate-csv-template.ts';
import type { DeadStockAnalysis } from './types.ts';

export function deadStockResultToCsv(analysis: DeadStockAnalysis): string {
	const header = [
		'item',
		'classification',
		'coverageMonths',
		'dormancyStatus',
		'excessQuantity',
		'exposureValue',
		'priority',
		'reasonCodes',
	];
	const rows = analysis.items.map((item) => [
		item.item,
		item.classification,
		item.coverageMonths === undefined ? 'n/a' : String(Math.round(item.coverageMonths * 100) / 100),
		item.dormancyStatus,
		String(item.excessQuantity),
		item.exposureValue === undefined ? 'unknown' : String(Math.round(item.exposureValue * 100) / 100),
		item.priority,
		item.reasonCodes.join('|'),
	]);
	return buildCsv([header, ...rows]);
}
