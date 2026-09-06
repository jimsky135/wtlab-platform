// Proves the whole entry path holds together for Demand Wave Radar:
// raw row → Shared Intake validate → confirm gate → adapter → the
// instrument's own validate → engine. Same loop every other instrument
// is covered by; the interesting part here is that a blank window has to
// survive all five stages as "missing", never becoming a 0.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeDemandWave } from '../../../tools/demand-wave-radar/analyze.ts';
import { demandWaveSchema } from '../../../tools/demand-wave-radar/schema.ts';
import { validateDemandWaveInput } from '../../../tools/demand-wave-radar/validate.ts';
import { confirmIntake } from '../../intake/confirm.ts';
import type { RawIntakeRecord } from '../../intake/types.ts';
import { validateRecords } from '../../intake/validate.ts';
import { demandWaveAdapter } from './adapter.ts';

function row(values: Record<string, string>): RawIntakeRecord {
	return { values, unknown: {} };
}

test('a partially filled row runs end to end and defends against the highest window', () => {
	const result = validateRecords([row({ itemName: 'M50', annual: '100', q3: '180' })], demandWaveSchema);
	assert.equal(result.errorCount, 0);

	const outcome = confirmIntake(demandWaveSchema, result);
	assert.equal(outcome.confirmed, true);
	if (!outcome.confirmed) return;

	const adapted = demandWaveAdapter(outcome.data);
	assert.equal(adapted.ok, true);
	if (!adapted.ok) return;

	assert.equal(adapted.data.length, 1);
	assert.equal(adapted.data[0].itemName, 'M50');

	const validated = validateDemandWaveInput(adapted.data[0].input);
	assert.equal(validated.valid, true);
	if (!validated.valid) return;

	const output = analyzeDemandWave(validated.data);
	assert.equal(output.windows.length, 2, 'the five blank windows must not appear as zeroes');
	assert.equal(output.highestWindow, 'q3');
	assert.equal(output.defensiveCoverage, 540);
});

test('the adapter leaves an absent window as an empty string, never as "0"', () => {
	const result = validateRecords([row({ itemName: 'M50', q1: '12' })], demandWaveSchema);
	const outcome = confirmIntake(demandWaveSchema, result);
	assert.equal(outcome.confirmed, true);
	if (!outcome.confirmed) return;

	const adapted = demandWaveAdapter(outcome.data);
	assert.equal(adapted.ok, true);
	if (!adapted.ok) return;

	assert.equal(adapted.data[0].input.q1, '12');
	assert.equal(adapted.data[0].input.annual, '');
	assert.equal(adapted.data[0].input.h1, '');
});

test('an all-blank row is stopped at the intake gate with a stable code', () => {
	const result = validateRecords([row({ itemName: 'M50' })], demandWaveSchema);
	assert.equal(result.errorCount, 1);
	assert.equal(result.issues.find((issue) => issue.severity === 'error')?.code, 'DEMAND_WAVE_NO_WINDOW_PROVIDED');

	const outcome = confirmIntake(demandWaveSchema, result);
	assert.equal(outcome.confirmed, false);
});

test('a negative window is stopped by the intake schema bound before the engine sees it', () => {
	const result = validateRecords([row({ itemName: 'M50', q2: '-3' })], demandWaveSchema);
	assert.ok(result.errorCount > 0);
	assert.equal(confirmIntake(demandWaveSchema, result).confirmed, false);
});

test('an unnamed item falls back to a stable placeholder name', () => {
	const result = validateRecords([row({ annual: '55' })], demandWaveSchema);
	const outcome = confirmIntake(demandWaveSchema, result);
	assert.equal(outcome.confirmed, true);
	if (!outcome.confirmed) return;

	const adapted = demandWaveAdapter(outcome.data);
	assert.equal(adapted.ok, true);
	if (adapted.ok) assert.equal(adapted.data[0].itemName, 'item');
});

test('an empty confirmed set is refused by the adapter with a stable code', () => {
	const adapted = demandWaveAdapter({ schemaId: demandWaveSchema.id, confirmedAt: '2026-01-01T00:00:00.000Z', records: [] });
	assert.equal(adapted.ok, false);
	if (!adapted.ok) assert.equal(adapted.issues[0].code, 'NO_CONFIRMED_ROWS');
});
