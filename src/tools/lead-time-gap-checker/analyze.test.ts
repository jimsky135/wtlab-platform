import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeLeadTimeGap } from './analyze.ts';
import type { LeadTimeGapValidatedInput } from './types.ts';

function input(overrides: Partial<LeadTimeGapValidatedInput> = {}): LeadTimeGapValidatedInput {
	return {
		currentStock: 100,
		monthlyConsumption: 10,
		leadTimeMonths: 1,
		safetyBufferMonths: 1,
		currentDate: '2026-01-01',
		...overrides,
	};
}

test('coverage months = currentStock / monthlyConsumption', () => {
	const result = analyzeLeadTimeGap(input({ currentStock: 100, monthlyConsumption: 10 }));
	assert.equal(result.coverageMonths, 10);
});

test('monthlyConsumption = 0 never depletes: safe, NO_CONSUMPTION, no dates', () => {
	const result = analyzeLeadTimeGap(input({ monthlyConsumption: 0 }));
	assert.equal(result.coverageMonths, undefined);
	assert.equal(result.estimatedDepletionDate, undefined);
	assert.equal(result.bufferFloorDate, undefined);
	assert.equal(result.risk, 'safe');
	assert.deepEqual(result.reasonCodes, ['NO_CONSUMPTION']);
	assert.equal(result.primaryWarningCode, undefined);
	assert.equal(result.recommendedActionCode, 'LEAD_TIME_ACTION_SAFE');
});

test('dates are computed as 30-day months from currentDate', () => {
	// coverage = 100/10 = 10 months = 300 days after 2026-01-01
	const result = analyzeLeadTimeGap(input({ currentStock: 100, monthlyConsumption: 10, safetyBufferMonths: 0 }));
	assert.equal(result.estimatedDepletionDate, '2026-10-28'); // 2026-01-01 + 300 days
	assert.equal(result.bufferFloorDate, result.estimatedDepletionDate); // buffer = 0 → same as depletion
	// lead time 1 month = 30 days after 2026-01-01
	assert.equal(result.expectedArrivalDate, '2026-01-31');
});

test('safe: arrival comfortably before the buffer floor', () => {
	// coverage 10mo, buffer 1mo → buffer floor at 9mo (~270 days). Lead time 1mo (30 days) arrives long before.
	const result = analyzeLeadTimeGap(input({ currentStock: 100, monthlyConsumption: 10, leadTimeMonths: 1, safetyBufferMonths: 1 }));
	assert.equal(result.risk, 'safe');
	assert.equal(result.gap, false);
	assert.ok(result.reasonCodes.includes('ADEQUATE_MARGIN'));
});

test('warning: arrival lands within the thin margin before the buffer floor', () => {
	// buffer floor at day 270 (2026-09-28). Lead time chosen so arrival lands 3 days before that.
	const result = analyzeLeadTimeGap(
		input({ currentStock: 100, monthlyConsumption: 10, safetyBufferMonths: 1, leadTimeMonths: 8.9 })
	);
	assert.equal(result.risk, 'warning');
	assert.equal(result.gap, false);
	assert.ok(result.reasonCodes.includes('THIN_MARGIN'));
});

test('gap-risk: arrival lands after the buffer floor but before full depletion', () => {
	// coverage 10mo (depletion day 300); buffer floor at 9mo (day 270). Lead time 9.5mo (day 285) is after
	// the buffer floor but before full depletion.
	const result = analyzeLeadTimeGap(
		input({ currentStock: 100, monthlyConsumption: 10, safetyBufferMonths: 1, leadTimeMonths: 9.5 })
	);
	assert.equal(result.risk, 'gap-risk');
	assert.equal(result.gap, true);
	assert.ok(result.gapDurationDays !== undefined && result.gapDurationDays > 0);
	assert.ok(result.reasonCodes.includes('BUFFER_BREACH_EXPECTED'));
	assert.equal(result.primaryWarningCode, 'LEAD_TIME_WARNING_GAP_RISK');
});

test('critical-gap: arrival lands after stock is fully depleted', () => {
	const result = analyzeLeadTimeGap(
		input({ currentStock: 100, monthlyConsumption: 10, safetyBufferMonths: 1, leadTimeMonths: 12 })
	);
	assert.equal(result.risk, 'critical-gap');
	assert.equal(result.gap, true);
	assert.ok(result.reasonCodes.includes('STOCKOUT_EXPECTED'));
	assert.ok(result.reasonCodes.includes('BUFFER_BREACH_EXPECTED'));
	assert.equal(result.primaryWarningCode, 'LEAD_TIME_WARNING_CRITICAL_GAP');
	assert.equal(result.recommendedActionCode, 'LEAD_TIME_ACTION_CRITICAL_GAP');
});

test('zero safety buffer: buffer floor date equals the depletion date', () => {
	const result = analyzeLeadTimeGap(input({ currentStock: 60, monthlyConsumption: 20, safetyBufferMonths: 0 }));
	assert.equal(result.bufferFloorDate, result.estimatedDepletionDate);
});

test('the engine is a pure function of its input — same input, same output, regardless of call order', () => {
	const a = analyzeLeadTimeGap(input({ leadTimeMonths: 9.5 }));
	const b = analyzeLeadTimeGap(input({ leadTimeMonths: 9.5 }));
	assert.deepEqual(a, b);
});
