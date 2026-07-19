// Lead Time Gap Checker engine — instrument business logic. v0.1 rules
// (Sprint 007):
//   coverageMonths      = currentStock / monthlyConsumption
//                         (undefined when consumption = 0 — never depletes)
//   estimatedDepletionDate = currentDate + coverageMonths (30-day months)
//   bufferFloorDate     = currentDate + (coverageMonths − safetyBufferMonths)
//                         (may be before currentDate if already below buffer)
//   expectedArrivalDate = currentDate + leadTimeMonths (if reordered today)
//   gapDays             = expectedArrivalDate − bufferFloorDate, in days
//   gapToZeroDays       = expectedArrivalDate − estimatedDepletionDate, in days
// Risk (first match wins, most severe first):
//   consumption = 0                          → safe          (NO_CONSUMPTION)
//   gapToZeroDays > 0                        → critical-gap  (STOCKOUT_EXPECTED)
//   gapDays > 0                              → gap-risk      (BUFFER_BREACH_EXPECTED)
//   -WARNING_MARGIN_DAYS < gapDays <= 0      → warning       (THIN_MARGIN)
//   otherwise                                → safe          (ADEQUATE_MARGIN)
// The engine never reads the system clock — `currentDate` is always
// supplied by the caller (see validate.ts), keeping this a pure function.

import type { MessageCode } from '../../platform/message-codes.ts';
import type { LeadTimeGapOutput, LeadTimeGapReasonCode, LeadTimeGapRisk, LeadTimeGapValidatedInput } from './types.ts';

const DAYS_PER_MONTH = 30;
const WARNING_MARGIN_DAYS = 7;

const RECOMMENDED_ACTION_CODE: Record<LeadTimeGapRisk, MessageCode> = {
	safe: 'LEAD_TIME_ACTION_SAFE',
	warning: 'LEAD_TIME_ACTION_WARNING',
	'gap-risk': 'LEAD_TIME_ACTION_GAP_RISK',
	'critical-gap': 'LEAD_TIME_ACTION_CRITICAL_GAP',
};

const PRIMARY_WARNING_CODE: Record<LeadTimeGapRisk, MessageCode | undefined> = {
	safe: undefined,
	warning: 'LEAD_TIME_WARNING_THIN_MARGIN',
	'gap-risk': 'LEAD_TIME_WARNING_GAP_RISK',
	'critical-gap': 'LEAD_TIME_WARNING_CRITICAL_GAP',
};

function addDays(iso: string, days: number): string {
	const date = new Date(`${iso}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + Math.round(days));
	return date.toISOString().slice(0, 10);
}

/** a − b, in whole days. */
function daysBetween(a: string, b: string): number {
	const MS_PER_DAY = 24 * 60 * 60 * 1000;
	return Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / MS_PER_DAY);
}

export function analyzeLeadTimeGap(input: LeadTimeGapValidatedInput): LeadTimeGapOutput {
	const { currentStock, monthlyConsumption, leadTimeMonths, safetyBufferMonths, currentDate } = input;

	const coverageMonths = monthlyConsumption > 0 ? currentStock / monthlyConsumption : undefined;
	const estimatedDepletionDate =
		coverageMonths !== undefined ? addDays(currentDate, coverageMonths * DAYS_PER_MONTH) : undefined;
	const bufferFloorDate =
		coverageMonths !== undefined
			? addDays(currentDate, (coverageMonths - safetyBufferMonths) * DAYS_PER_MONTH)
			: undefined;
	const expectedArrivalDate = addDays(currentDate, leadTimeMonths * DAYS_PER_MONTH);

	const gapDays = bufferFloorDate !== undefined ? daysBetween(expectedArrivalDate, bufferFloorDate) : undefined;
	const gapToZeroDays =
		estimatedDepletionDate !== undefined ? daysBetween(expectedArrivalDate, estimatedDepletionDate) : undefined;

	const reasons: LeadTimeGapReasonCode[] = [];
	if (monthlyConsumption === 0) reasons.push('NO_CONSUMPTION');
	if (gapToZeroDays !== undefined && gapToZeroDays > 0) reasons.push('STOCKOUT_EXPECTED');
	if (gapDays !== undefined && gapDays > 0) reasons.push('BUFFER_BREACH_EXPECTED');
	if (gapDays !== undefined && gapDays <= 0 && gapDays > -WARNING_MARGIN_DAYS) reasons.push('THIN_MARGIN');
	if (gapDays !== undefined && gapDays <= -WARNING_MARGIN_DAYS) reasons.push('ADEQUATE_MARGIN');

	let risk: LeadTimeGapRisk;
	if (monthlyConsumption === 0) {
		risk = 'safe';
	} else if (gapToZeroDays !== undefined && gapToZeroDays > 0) {
		risk = 'critical-gap';
	} else if (gapDays !== undefined && gapDays > 0) {
		risk = 'gap-risk';
	} else if (gapDays !== undefined && gapDays > -WARNING_MARGIN_DAYS) {
		risk = 'warning';
	} else {
		risk = 'safe';
	}

	const gap = gapDays !== undefined && gapDays > 0;

	return {
		coverageMonths,
		estimatedDepletionDate,
		bufferFloorDate,
		expectedArrivalDate,
		gap,
		gapDurationDays: gap ? gapDays : undefined,
		risk,
		reasonCodes: reasons,
		primaryWarningCode: PRIMARY_WARNING_CODE[risk],
		recommendedActionCode: RECOMMENDED_ACTION_CODE[risk],
	};
}
