// Standard input/output for Advanced Planning — mirrors the platform's
// established rolling-balance projection pattern (see Water Level's
// modes/advanced/types.ts), extended with the lead-time/gap dimension
// that is this instrument's own contribution (Sprint 007).

export interface LeadTimeGapPlanningPeriod {
	/** Sequence number as supplied (1, 2, 3 …). Sorted ascending. */
	period: number;
	consumption: number;
	arrivalQuantity: number;
}

export interface LeadTimeGapPlanningItem {
	name: string;
	beginningInventory: number;
	/** Item-level, from its first row. Undefined = lead time not declared for this item. */
	supplierLeadTimeMonths: number | undefined;
	/** Buffer expressed in months of average consumption; optional. */
	safetyBufferMonths: number | undefined;
	periods: LeadTimeGapPlanningPeriod[];
}

export interface LeadTimeGapAdvancedInput {
	items: LeadTimeGapPlanningItem[];
}

export interface LeadTimeGapProjectedPeriod {
	period: number;
	arrivalQuantity: number;
	consumption: number;
	endingBalance: number;
	/** Ending balance below zero. */
	shortage: boolean;
	/** Ending balance below the item's safety buffer stock (if declared). */
	belowBuffer: boolean;
}

export type LeadTimeGapItemRiskLevel = 'shortage' | 'gap-window' | 'buffer-breach' | 'ok';

export interface LeadTimeGapProjectedItem {
	name: string;
	beginningInventory: number;
	averageConsumption: number;
	/** avg consumption × safetyBufferMonths; undefined when no buffer declared. */
	bufferStock: number | undefined;
	periods: LeadTimeGapProjectedPeriod[];
	firstShortagePeriod: number | undefined;
	/** How many periods show a shortage — supports the "multiple shortages" requirement. */
	shortagePeriodCount: number;
	firstBufferBreachPeriod: number | undefined;
	/** Period a replenishment ordered *right now* (period 0) would land in, rounded; undefined when lead time not declared. Periods are treated as months. */
	expectedArrivalPeriod: number | undefined;
	/** True when the earliest shortage/buffer breach happens before a now-ordered replenishment could arrive. */
	gapWindow: boolean;
	riskLevel: LeadTimeGapItemRiskLevel;
}

export interface LeadTimeGapProjectionResult {
	items: LeadTimeGapProjectedItem[];
	/** Item names ordered most-at-risk first. */
	riskRanking: string[];
}
