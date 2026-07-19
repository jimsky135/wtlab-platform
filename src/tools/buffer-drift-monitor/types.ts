// Buffer Drift Monitor — instrument types (Sprint 008, fifth production
// instrument — first built after the Quick Form Generator extraction).
// Distinct from every prior instrument's model: this engine compares an
// INTENDED safety-buffer policy (months of consumption) against the
// ACTUAL buffer being held, and quantifies the drift between them.

import type { MessageCode } from '../../platform/message-codes.ts';

export interface BufferDriftRawInput {
	monthlyConsumption: string;
	intendedBufferMonths: string;
	actualBufferQuantity: string;
}

export interface BufferDriftValidatedInput {
	monthlyConsumption: number;
	intendedBufferMonths: number;
	actualBufferQuantity: number;
}

export type BufferDriftStatus =
	| 'on-target'
	| 'under-buffered'
	| 'severely-under-buffered'
	| 'over-buffered'
	| 'severely-over-buffered';

export type BufferDriftReasonCode =
	| 'NO_CONSUMPTION'
	| 'NO_INTENDED_BUFFER'
	| 'WITHIN_TOLERANCE'
	| 'BELOW_INTENDED'
	| 'SEVERELY_BELOW_INTENDED'
	| 'ABOVE_INTENDED'
	| 'SEVERELY_ABOVE_INTENDED';

export interface BufferDriftThresholds {
	/** |drift %| at or below this is on-target. */
	toleranceDriftPercent: number;
	/** |drift %| beyond this is severe. */
	majorDriftPercent: number;
}

export const DEFAULT_DRIFT_THRESHOLDS: BufferDriftThresholds = {
	toleranceDriftPercent: 10,
	majorDriftPercent: 30,
};

/**
 * Calculation output. `actualBufferMonths`/`driftMonths`/`driftPercent`
 * are undefined only in the documented edge cases (zero consumption,
 * zero intended buffer) where the ratio they'd require is undefined.
 */
export interface BufferDriftOutput {
	intendedBufferQuantity: number;
	actualBufferMonths: number | undefined;
	driftMonths: number | undefined;
	driftQuantity: number;
	driftPercent: number | undefined;
	status: BufferDriftStatus;
	reasonCodes: BufferDriftReasonCode[];
	primaryWarningCode: MessageCode | undefined;
	recommendedActionCode: MessageCode;
}
