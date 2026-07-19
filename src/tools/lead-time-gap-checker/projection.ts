// Advanced Planning projection engine — instrument business logic
// (Sprint 007). Rolling balance per period uses the platform's
// established formula (ending = previous + arrivals − consumption;
// buffer stock = average consumption × safetyBufferMonths — see Water
// Level's projection.ts for the same documented definition). This
// instrument's own contribution is the lead-time/gap dimension: comparing
// the earliest shortage/buffer-breach period against the period a
// replenishment ordered *right now* would land in. Periods are treated as
// months, matching the platform's month-unit convention.

import type {
	LeadTimeGapAdvancedInput,
	LeadTimeGapItemRiskLevel,
	LeadTimeGapProjectedItem,
	LeadTimeGapProjectedPeriod,
	LeadTimeGapProjectionResult,
} from './modes/advanced/types.ts';

function projectItem(item: {
	name: string;
	beginningInventory: number;
	supplierLeadTimeMonths: number | undefined;
	safetyBufferMonths: number | undefined;
	periods: Array<{ period: number; consumption: number; arrivalQuantity: number }>;
}): LeadTimeGapProjectedItem {
	const sorted = [...item.periods].sort((a, b) => a.period - b.period);
	const totalConsumption = sorted.reduce((sum, p) => sum + p.consumption, 0);
	const averageConsumption = sorted.length > 0 ? totalConsumption / sorted.length : 0;
	const bufferStock =
		item.safetyBufferMonths !== undefined ? averageConsumption * item.safetyBufferMonths : undefined;

	let balance = item.beginningInventory;
	const periods: LeadTimeGapProjectedPeriod[] = sorted.map((p) => {
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
	const shortagePeriodCount = periods.filter((p) => p.shortage).length;
	const firstBufferBreachPeriod = periods.find((p) => p.belowBuffer)?.period;
	const expectedArrivalPeriod =
		item.supplierLeadTimeMonths !== undefined ? Math.round(item.supplierLeadTimeMonths) : undefined;

	const earliestRiskPeriod = firstShortagePeriod ?? firstBufferBreachPeriod;
	const gapWindow =
		earliestRiskPeriod !== undefined &&
		expectedArrivalPeriod !== undefined &&
		earliestRiskPeriod < expectedArrivalPeriod;

	const riskLevel: LeadTimeGapItemRiskLevel =
		firstShortagePeriod !== undefined
			? 'shortage'
			: firstBufferBreachPeriod !== undefined
				? gapWindow
					? 'gap-window'
					: 'buffer-breach'
				: 'ok';

	return {
		name: item.name,
		beginningInventory: item.beginningInventory,
		averageConsumption,
		bufferStock,
		periods,
		firstShortagePeriod,
		shortagePeriodCount,
		firstBufferBreachPeriod,
		expectedArrivalPeriod,
		gapWindow,
		riskLevel,
	};
}

const RISK_ORDER: Record<LeadTimeGapItemRiskLevel, number> = {
	shortage: 0,
	'gap-window': 1,
	'buffer-breach': 2,
	ok: 3,
};

export function computeLeadTimeGapProjection(input: LeadTimeGapAdvancedInput): LeadTimeGapProjectionResult {
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
