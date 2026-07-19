// Advanced Planning projection engine — instrument business logic
// (Sprint 008). Per period, reuses the exact same classifyDrift rules as
// the Quick engine (analyze.ts) — one classification function, not
// duplicated. This module's own contribution is the TREND dimension:
// comparing the first and last period's drift magnitude to say whether
// the gap between actual and intended buffer is widening, narrowing, or
// holding steady.

import { DEFAULT_DRIFT_THRESHOLDS } from './types.ts';
import { classifyDrift } from './analyze.ts';
import type {
	BufferDriftAdvancedInput,
	BufferDriftProjectedItem,
	BufferDriftProjectedPeriod,
	BufferDriftProjectionResult,
	BufferDriftTrend,
} from './modes/advanced/types.ts';
import type { BufferDriftStatus } from './types.ts';

/** Below this many percentage points of change, the trend reads as stable rather than noise. */
const TREND_EPSILON_PERCENT = 5;

function projectPeriod(
	period: { period: number; monthlyConsumption: number; actualBufferQuantity: number },
	intendedBufferMonths: number
): BufferDriftProjectedPeriod {
	const actualBufferMonths =
		period.monthlyConsumption > 0 ? period.actualBufferQuantity / period.monthlyConsumption : undefined;
	const driftMonths = actualBufferMonths !== undefined ? actualBufferMonths - intendedBufferMonths : undefined;
	const driftPercent =
		intendedBufferMonths > 0 && driftMonths !== undefined ? (driftMonths / intendedBufferMonths) * 100 : undefined;

	let status: BufferDriftStatus;
	if (period.monthlyConsumption === 0) {
		status = 'on-target';
	} else if (intendedBufferMonths === 0) {
		status = period.actualBufferQuantity === 0 ? 'on-target' : 'over-buffered';
	} else {
		status = classifyDrift(driftPercent!, DEFAULT_DRIFT_THRESHOLDS);
	}

	return {
		period: period.period,
		monthlyConsumption: period.monthlyConsumption,
		actualBufferQuantity: period.actualBufferQuantity,
		actualBufferMonths,
		driftMonths,
		driftPercent,
		status,
	};
}

function projectItem(item: {
	name: string;
	intendedBufferMonths: number;
	periods: Array<{ period: number; monthlyConsumption: number; actualBufferQuantity: number }>;
}): BufferDriftProjectedItem {
	const sorted = [...item.periods].sort((a, b) => a.period - b.period);
	const periods = sorted.map((p) => projectPeriod(p, item.intendedBufferMonths));

	const latestStatus = periods[periods.length - 1]?.status ?? 'on-target';
	const firstAbsPercent = Math.abs(periods[0]?.driftPercent ?? 0);
	const lastAbsPercent = Math.abs(periods[periods.length - 1]?.driftPercent ?? 0);
	let trend: BufferDriftTrend;
	if (lastAbsPercent > firstAbsPercent + TREND_EPSILON_PERCENT) trend = 'widening';
	else if (lastAbsPercent < firstAbsPercent - TREND_EPSILON_PERCENT) trend = 'narrowing';
	else trend = 'stable';

	return {
		name: item.name,
		intendedBufferMonths: item.intendedBufferMonths,
		periods,
		latestStatus,
		trend,
	};
}

const STATUS_ORDER: Record<BufferDriftStatus, number> = {
	'severely-under-buffered': 0,
	'under-buffered': 1,
	'severely-over-buffered': 2,
	'over-buffered': 3,
	'on-target': 4,
};
const TREND_ORDER: Record<BufferDriftTrend, number> = { widening: 0, stable: 1, narrowing: 2 };

export function computeBufferDriftProjection(input: BufferDriftAdvancedInput): BufferDriftProjectionResult {
	const items = input.items.map(projectItem);

	const riskRanking = [...items]
		.sort((a, b) => {
			const byStatus = STATUS_ORDER[a.latestStatus] - STATUS_ORDER[b.latestStatus];
			if (byStatus !== 0) return byStatus;
			return TREND_ORDER[a.trend] - TREND_ORDER[b.trend];
		})
		.map((item) => item.name);

	return { items, riskRanking };
}
