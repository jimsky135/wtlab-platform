// Dead Stock Scanner — instrument types. The engine separates movement,
// coverage, future demand, quantity, and value; classification is a
// transparent rules-based model (no scoring, no opaque weights) and
// every result carries machine-readable reason codes.

export type DeadStockClassification = 'healthy' | 'slow-moving' | 'dormant' | 'dead-stock' | 'excess-exposure';

export type DormancyStatus = 'active' | 'dormant' | 'long-dormant' | 'unknown';

export type DeadStockPriority = 'high' | 'medium' | 'low';

export type ReasonCode =
	| 'ACTIVE_CONSUMPTION'
	| 'NO_CONSUMPTION_DATA'
	| 'NO_RECENT_MOVEMENT'
	| 'UNKNOWN_MOVEMENT_AGE'
	| 'NO_FUTURE_DEMAND'
	| 'FUTURE_DEMAND_SUPPORT'
	| 'HIGH_COVERAGE'
	| 'EXCESS_QUANTITY'
	| 'NO_STOCK';

/**
 * Explicit, configurable thresholds (months). Defaults are documented
 * assumptions, not hidden constants — quick mode can override the
 * coverage threshold via its optional thresholdMonths input.
 */
export interface DeadStockThresholds {
	/** No movement for ≥ this → dormant band. */
	dormantMonths: number;
	/** No movement for ≥ this → long-dormant band / dead-stock candidate. */
	deadMonths: number;
	/** Coverage above this is considered high (slow-moving candidate). */
	highCoverageMonths: number;
	/** Coverage above this is considered materially excessive. */
	excessCoverageMonths: number;
}

export const DEFAULT_THRESHOLDS: DeadStockThresholds = {
	dormantMonths: 6,
	deadMonths: 12,
	highCoverageMonths: 12,
	excessCoverageMonths: 24,
};

export interface DeadStockItemInput {
	item: string;
	currentStock: number;
	recentMonthlyConsumption: number;
	/** undefined = unknown (uncertainty prevents a dead-stock verdict). */
	monthsSinceLastMovement: number | undefined;
	/** undefined = unknown; 0 = explicitly known to be zero. */
	futureDemand: number | undefined;
	unitCost: number | undefined;
	category: string | undefined;
}

export interface DeadStockAnalysisInput {
	items: DeadStockItemInput[];
	thresholds: DeadStockThresholds;
}

export interface DeadStockItemResult {
	item: string;
	classification: DeadStockClassification;
	/** stock / consumption; undefined when consumption is 0. */
	coverageMonths: number | undefined;
	dormancyStatus: DormancyStatus;
	/** Whether known future demand fully supports current stock. */
	futureDemandSupport: boolean;
	excessQuantity: number;
	/** unitCost × exposed quantity; undefined without a unit cost. */
	exposureValue: number | undefined;
	priority: DeadStockPriority;
	reasonCodes: ReasonCode[];
	primaryWarning: string | undefined;
	recommendedAction: string;
}

export interface DeadStockPortfolioSummary {
	totalItems: number;
	counts: Record<DeadStockClassification, number>;
	totalExcessQuantity: number;
	/** Sum over items with a known exposure value. */
	totalExposureValue: number;
	/** Items lacking unit cost — exposure total is a lower bound if > 0. */
	itemsWithoutUnitCost: number;
	/** Item names, most severe first, capped at 5. */
	topRiskItems: string[];
}

export interface DeadStockAnalysis {
	items: DeadStockItemResult[];
	summary: DeadStockPortfolioSummary;
	thresholds: DeadStockThresholds;
}
