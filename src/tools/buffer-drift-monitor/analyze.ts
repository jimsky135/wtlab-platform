// Buffer Drift Monitor engine — instrument business logic. v0.1 rules
// (Sprint 008):
//   intendedBufferQuantity = monthlyConsumption × intendedBufferMonths
//   actualBufferMonths     = actualBufferQuantity / monthlyConsumption
//                            (undefined when consumption = 0)
//   driftQuantity          = actualBufferQuantity − intendedBufferQuantity
//   driftMonths            = actualBufferMonths − intendedBufferMonths
//   driftPercent           = (driftMonths / intendedBufferMonths) × 100
//                            (undefined when intendedBufferMonths = 0)
// Status (first match wins, most severe first):
//   consumption = 0                          → on-target  (NO_CONSUMPTION — can't assess without a rate)
//   intendedBufferMonths = 0 (policy: no buffer needed):
//     actualBufferQuantity = 0               → on-target  (NO_INTENDED_BUFFER)
//     actualBufferQuantity > 0               → over-buffered (NO_INTENDED_BUFFER)
//   |driftPercent| ≤ toleranceDriftPercent    → on-target  (WITHIN_TOLERANCE)
//   driftPercent < −majorDriftPercent         → severely-under-buffered
//   driftPercent < −toleranceDriftPercent     → under-buffered
//   driftPercent > majorDriftPercent          → severely-over-buffered
//   driftPercent > toleranceDriftPercent      → over-buffered

import type { MessageCode } from '../../platform/message-codes.ts';
import {
	DEFAULT_DRIFT_THRESHOLDS,
	type BufferDriftOutput,
	type BufferDriftReasonCode,
	type BufferDriftStatus,
	type BufferDriftThresholds,
	type BufferDriftValidatedInput,
} from './types.ts';

const RECOMMENDED_ACTION_CODE: Record<BufferDriftStatus, MessageCode> = {
	'on-target': 'BUFFER_DRIFT_ACTION_ON_TARGET',
	'under-buffered': 'BUFFER_DRIFT_ACTION_UNDER',
	'severely-under-buffered': 'BUFFER_DRIFT_ACTION_SEVERE_UNDER',
	'over-buffered': 'BUFFER_DRIFT_ACTION_OVER',
	'severely-over-buffered': 'BUFFER_DRIFT_ACTION_SEVERE_OVER',
};

const PRIMARY_WARNING_CODE: Record<BufferDriftStatus, MessageCode | undefined> = {
	'on-target': undefined,
	'under-buffered': 'BUFFER_DRIFT_WARNING_UNDER',
	'severely-under-buffered': 'BUFFER_DRIFT_WARNING_SEVERE_UNDER',
	'over-buffered': 'BUFFER_DRIFT_WARNING_OVER',
	'severely-over-buffered': 'BUFFER_DRIFT_WARNING_SEVERE_OVER',
};

export function classifyDrift(driftPercent: number, thresholds: BufferDriftThresholds): BufferDriftStatus {
	if (Math.abs(driftPercent) <= thresholds.toleranceDriftPercent) return 'on-target';
	if (driftPercent < -thresholds.majorDriftPercent) return 'severely-under-buffered';
	if (driftPercent < -thresholds.toleranceDriftPercent) return 'under-buffered';
	if (driftPercent > thresholds.majorDriftPercent) return 'severely-over-buffered';
	return 'over-buffered';
}

const REASON_FOR_STATUS: Record<BufferDriftStatus, BufferDriftReasonCode> = {
	'on-target': 'WITHIN_TOLERANCE',
	'under-buffered': 'BELOW_INTENDED',
	'severely-under-buffered': 'SEVERELY_BELOW_INTENDED',
	'over-buffered': 'ABOVE_INTENDED',
	'severely-over-buffered': 'SEVERELY_ABOVE_INTENDED',
};

export function analyzeBufferDrift(
	input: BufferDriftValidatedInput,
	thresholds: BufferDriftThresholds = DEFAULT_DRIFT_THRESHOLDS
): BufferDriftOutput {
	const { monthlyConsumption, intendedBufferMonths, actualBufferQuantity } = input;

	const intendedBufferQuantity = monthlyConsumption * intendedBufferMonths;
	const actualBufferMonths = monthlyConsumption > 0 ? actualBufferQuantity / monthlyConsumption : undefined;
	const driftQuantity = actualBufferQuantity - intendedBufferQuantity;
	const driftMonths = actualBufferMonths !== undefined ? actualBufferMonths - intendedBufferMonths : undefined;
	const driftPercent =
		intendedBufferMonths > 0 && driftMonths !== undefined ? (driftMonths / intendedBufferMonths) * 100 : undefined;

	let status: BufferDriftStatus;
	let reasonCodes: BufferDriftReasonCode[];

	if (monthlyConsumption === 0) {
		status = 'on-target';
		reasonCodes = ['NO_CONSUMPTION'];
	} else if (intendedBufferMonths === 0) {
		status = actualBufferQuantity === 0 ? 'on-target' : 'over-buffered';
		reasonCodes = ['NO_INTENDED_BUFFER'];
	} else {
		status = classifyDrift(driftPercent!, thresholds);
		reasonCodes = [REASON_FOR_STATUS[status]];
	}

	return {
		intendedBufferQuantity,
		actualBufferMonths,
		driftMonths,
		driftQuantity,
		driftPercent,
		status,
		reasonCodes,
		primaryWarningCode: PRIMARY_WARNING_CODE[status],
		recommendedActionCode: RECOMMENDED_ACTION_CODE[status],
	};
}
