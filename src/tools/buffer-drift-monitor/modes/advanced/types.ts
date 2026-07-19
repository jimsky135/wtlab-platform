// Standard input/output for Advanced Planning — long-format rolling
// tracking, same platform convention as every other instrument's advanced
// mode. This instrument's own contribution is the TREND dimension: is the
// drift between actual and intended buffer widening, narrowing, or
// stable across periods (Sprint 008 — "over time" is the point).

import type { BufferDriftStatus } from '../../types.ts';

export interface BufferDriftPlanningPeriod {
	/** Sequence number as supplied (1, 2, 3 …). Sorted ascending. */
	period: number;
	monthlyConsumption: number;
	actualBufferQuantity: number;
}

export interface BufferDriftPlanningItem {
	name: string;
	/** Item-level policy target, from its first row. */
	intendedBufferMonths: number;
	periods: BufferDriftPlanningPeriod[];
}

export interface BufferDriftAdvancedInput {
	items: BufferDriftPlanningItem[];
}

export interface BufferDriftProjectedPeriod {
	period: number;
	monthlyConsumption: number;
	actualBufferQuantity: number;
	actualBufferMonths: number | undefined;
	driftMonths: number | undefined;
	driftPercent: number | undefined;
	status: BufferDriftStatus;
}

export type BufferDriftTrend = 'widening' | 'narrowing' | 'stable';

export interface BufferDriftProjectedItem {
	name: string;
	intendedBufferMonths: number;
	periods: BufferDriftProjectedPeriod[];
	/** Status of the most recent period. */
	latestStatus: BufferDriftStatus;
	/** Whether |drift| is growing, shrinking, or holding across the timeline. */
	trend: BufferDriftTrend;
}

export interface BufferDriftProjectionResult {
	items: BufferDriftProjectedItem[];
	/** Item names ordered most-at-risk first. */
	riskRanking: string[];
}
