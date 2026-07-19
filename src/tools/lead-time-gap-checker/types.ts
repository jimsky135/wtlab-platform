// Lead Time Gap Checker — instrument types (Sprint 007, fourth production
// instrument). Distinct from Water Level's coverage-vs-quantity model:
// this engine compares TIME alignment — when replenishment would arrive
// versus when stock (and its safety buffer) would run out.

import type { MessageCode } from '../../platform/message-codes.ts';

export type TimeUnit = 'day' | 'month';

/**
 * Raw input as it comes off an HTML form — numeric fields are strings.
 * `currentDate` may be blank; validation resolves it to today.
 */
export interface LeadTimeGapRawInput {
	currentStock: string;
	monthlyConsumption: string;
	leadTime: string;
	leadTimeUnit: TimeUnit;
	safetyBuffer: string;
	safetyBufferUnit: TimeUnit;
	/** ISO 'YYYY-MM-DD'; blank means "use today". */
	currentDate: string;
}

/** Input after validation/normalization: all numeric, time values in months, date always resolved. */
export interface LeadTimeGapValidatedInput {
	currentStock: number;
	monthlyConsumption: number;
	leadTimeMonths: number;
	safetyBufferMonths: number;
	/** ISO 'YYYY-MM-DD' — always resolved, never blank. */
	currentDate: string;
}

export type LeadTimeGapRisk = 'safe' | 'warning' | 'gap-risk' | 'critical-gap';

export type LeadTimeGapReasonCode =
	| 'NO_CONSUMPTION'
	| 'STOCKOUT_EXPECTED'
	| 'BUFFER_BREACH_EXPECTED'
	| 'THIN_MARGIN'
	| 'ADEQUATE_MARGIN';

/**
 * Calculation output. Dates are ISO strings so the engine stays a pure
 * function of `currentDate` (never reads the system clock). `undefined`
 * depletion/buffer-floor dates mean the item never depletes at the
 * declared consumption rate (0/month).
 */
export interface LeadTimeGapOutput {
	coverageMonths: number | undefined;
	estimatedDepletionDate: string | undefined;
	bufferFloorDate: string | undefined;
	expectedArrivalDate: string;
	/** True when expected arrival lands after the safety buffer would be reached. */
	gap: boolean;
	/** Magnitude of the gap in days; undefined when `gap` is false. */
	gapDurationDays: number | undefined;
	risk: LeadTimeGapRisk;
	reasonCodes: LeadTimeGapReasonCode[];
	/** Stable, locale-independent narrative codes (never translated in the engine). */
	primaryWarningCode: MessageCode | undefined;
	recommendedActionCode: MessageCode;
}
