// Standard input/output for Advanced Planning — the instrument's own
// data contract for multi-item, multi-period projection. Adapters
// convert intake rows INTO AdvancedPlanningInput; they never compute.

export interface PlanningPeriod {
	/** Sequence number as supplied (1, 2, 3 …). Sorted ascending. */
	period: number;
	consumption: number;
	arrivalQuantity: number;
}

export interface PlanningItem {
	name: string;
	beginningInventory: number;
	/** Buffer expressed in months of average consumption; optional. */
	safetyBufferMonths: number | undefined;
	periods: PlanningPeriod[];
}

export interface AdvancedPlanningInput {
	items: PlanningItem[];
}

export interface ProjectedPeriod {
	period: number;
	arrivalQuantity: number;
	consumption: number;
	endingBalance: number;
	/** Ending balance below zero. */
	shortage: boolean;
	/** Ending balance below the item's safety buffer stock (if declared). */
	belowBuffer: boolean;
}

export type ItemRiskLevel = 'shortage' | 'buffer-breach' | 'ok';

export interface ProjectedItem {
	name: string;
	beginningInventory: number;
	averageConsumption: number;
	/** avg consumption × safetyBufferMonths; undefined when no buffer declared. */
	bufferStock: number | undefined;
	periods: ProjectedPeriod[];
	firstShortagePeriod: number | undefined;
	firstBufferBreachPeriod: number | undefined;
	riskLevel: ItemRiskLevel;
}

export interface ProjectionResult {
	items: ProjectedItem[];
	/** Item names ordered most-at-risk first. */
	riskRanking: string[];
}
