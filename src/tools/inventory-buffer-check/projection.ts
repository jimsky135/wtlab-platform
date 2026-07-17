// Advanced Planning projection engine — instrument business logic.
// Rolling balance per period: ending = previous + arrivals - consumption.
// Buffer stock = average consumption × safetyBufferMonths (documented
// definition; average keeps the threshold stable across periods).
// This EXTENDS the instrument for multi-period planning; it does not
// duplicate the single-item coverage engine in calculate.ts.

import type {
	AdvancedPlanningInput,
	ItemRiskLevel,
	ProjectedItem,
	ProjectedPeriod,
	ProjectionResult,
} from './modes/advanced/types.ts';

function projectItem(item: {
	name: string;
	beginningInventory: number;
	safetyBufferMonths: number | undefined;
	periods: Array<{ period: number; consumption: number; arrivalQuantity: number }>;
}): ProjectedItem {
	const sorted = [...item.periods].sort((a, b) => a.period - b.period);
	const totalConsumption = sorted.reduce((sum, p) => sum + p.consumption, 0);
	const averageConsumption = sorted.length > 0 ? totalConsumption / sorted.length : 0;
	const bufferStock =
		item.safetyBufferMonths !== undefined ? averageConsumption * item.safetyBufferMonths : undefined;

	let balance = item.beginningInventory;
	const periods: ProjectedPeriod[] = sorted.map((p) => {
		balance = balance + p.arrivalQuantity - p.consumption;
		return {
			period: p.period,
			arrivalQuantity: p.arrivalQuantity,
			consumption: p.consumption,
			endingBalance: balance,
			shortage: balance < 0,
			belowBuffer: bufferStock !== undefined && balance < bufferStock,
		};
	});

	const firstShortagePeriod = periods.find((p) => p.shortage)?.period;
	const firstBufferBreachPeriod = periods.find((p) => p.belowBuffer)?.period;
	const riskLevel: ItemRiskLevel =
		firstShortagePeriod !== undefined ? 'shortage' : firstBufferBreachPeriod !== undefined ? 'buffer-breach' : 'ok';

	return {
		name: item.name,
		beginningInventory: item.beginningInventory,
		averageConsumption,
		bufferStock,
		periods,
		firstShortagePeriod,
		firstBufferBreachPeriod,
		riskLevel,
	};
}

const RISK_ORDER: Record<ItemRiskLevel, number> = { shortage: 0, 'buffer-breach': 1, ok: 2 };

export function computeRollingProjection(input: AdvancedPlanningInput): ProjectionResult {
	const items = input.items.map(projectItem);

	const riskRanking = [...items]
		.sort((a, b) => {
			const byLevel = RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
			if (byLevel !== 0) return byLevel;
			const aPeriod = a.firstShortagePeriod ?? a.firstBufferBreachPeriod ?? Number.POSITIVE_INFINITY;
			const bPeriod = b.firstShortagePeriod ?? b.firstBufferBreachPeriod ?? Number.POSITIVE_INFINITY;
			return aPeriod - bPeriod;
		})
		.map((item) => item.name);

	return { items, riskRanking };
}
