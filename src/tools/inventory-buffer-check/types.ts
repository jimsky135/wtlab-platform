// Inventory Buffer Check ("Water Level Checker") — tool-specific types.
// Corresponds to Tool Specification v0.2. These types are local to this
// tool; the platform Tool Contract never assumes their shape.

export type TimeUnit = 'day' | 'month';

/**
 * Raw input as it comes off an HTML form — numeric fields are strings,
 * and optional fields (in-transit quantity / arrival time) are omittable
 * to express "not provided" rather than coerced to a sentinel value.
 */
export interface InventoryBufferRawInput {
	currentStock: string;
	monthlyConsumption: string;
	leadTime: string;
	leadTimeUnit: TimeUnit;
	safetyBuffer: string;
	safetyBufferUnit: TimeUnit;
	inTransitQuantity?: string;
	arrivalTime?: string;
	arrivalTimeUnit?: TimeUnit;
}

/**
 * Input after validation/normalization: all numeric, all time values
 * converted to months (1 month = 30 days). `inTransitQuantity` and
 * `arrivalTimeMonths` stay `undefined` when not provided — Tool
 * Specification v0.2 treats "not provided" as a distinct state from any
 * numeric value, so it is not defaulted to 0 here.
 */
export interface InventoryBufferValidatedInput {
	currentStock: number;
	monthlyConsumption: number;
	leadTimeMonths: number;
	safetyBufferMonths: number;
	inTransitQuantity: number | undefined;
	arrivalTimeMonths: number | undefined;
}

export type ArrivalRisk = 'possible-shortage' | 'can-cover-until-arrival' | 'arrival-time-not-provided';

export type RiskStatus = 'safe' | 'caution' | 'high-risk';

/**
 * Calculation output, unrounded. `totalCoverageMonths` stays `undefined`
 * when no in-transit quantity was provided — Tool Specification v0.2
 * requires this to read as "not provided", not as equal to
 * `currentCoverageMonths`. Formatting/rounding is a display concern, not
 * this core's responsibility.
 */
export interface InventoryBufferOutput {
	currentCoverageMonths: number;
	totalCoverageMonths: number | undefined;
	minimumSafetyStock: number;
	reorderPoint: number;
	arrivalRisk: ArrivalRisk;
	riskStatus: RiskStatus;
}
