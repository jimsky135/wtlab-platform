// Result export. Result-only headers (deliberately NOT the input schema
// ids) so a result file can never be re-mapped as an input CSV.

import { buildCsv } from '../../platform/templates/generate-csv-template.ts';
import type { ArrivalAnalysis } from './types.ts';

export function arrivalResultToCsv(analysis: ArrivalAnalysis): string {
	const header = [
		'month',
		'totalQuantity',
		'batchCount',
		'containerCount',
		'supplierCount',
		'sharePercent',
		'overCapacity',
		'collisionLevel',
	];
	const rows = analysis.months.map((month) => [
		month.monthKey,
		String(month.totalQuantity),
		String(month.batchCount),
		String(month.containerCount),
		String(month.supplierCount),
		String(Math.round(month.share * 100)),
		month.overCapacity === undefined ? 'n/a' : month.overCapacity ? 'yes' : 'no',
		analysis.collisionLevel,
	]);
	return buildCsv([header, ...rows]);
}
