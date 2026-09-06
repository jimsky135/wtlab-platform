import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeDemandWave } from './analyze.ts';
import {
	DEFAULT_DEMAND_WAVE_THRESHOLDS,
	type DemandWaveValidatedInput,
	type DemandWindowAverage,
} from './types.ts';

function windows(...entries: DemandWindowAverage[]): DemandWaveValidatedInput {
	return { windows: entries };
}

test('defensive coverage is the highest monthly average held for three months', () => {
	const output = analyzeDemandWave(
		windows(
			{ window: 'annual', monthlyAverage: 100 },
			{ window: 'q3', monthlyAverage: 180 },
			{ window: 'q4', monthlyAverage: 120 }
		)
	);
	assert.equal(output.highestMonthlyAverage, 180);
	assert.equal(output.highestWindow, 'q3');
	assert.equal(output.defensiveCoverage, 540);
	assert.equal(output.defensiveCoverageMonths, 3);
});

test('the highest window can be any window — the annual average is not privileged', () => {
	const output = analyzeDemandWave(
		windows({ window: 'annual', monthlyAverage: 50 }, { window: 'h2', monthlyAverage: 90 })
	);
	assert.equal(output.highestWindow, 'h2');
	assert.equal(output.defensiveCoverage, 270);
});

test('every provided window is preserved in the output, not collapsed to the maximum', () => {
	const input = windows(
		{ window: 'annual', monthlyAverage: 100 },
		{ window: 'h1', monthlyAverage: 60 },
		{ window: 'h2', monthlyAverage: 140 }
	);
	const output = analyzeDemandWave(input);
	assert.deepEqual(output.windows, input.windows);
});

test('a tie resolves to the first window in canonical order, deterministically', () => {
	const output = analyzeDemandWave(
		windows(
			{ window: 'h1', monthlyAverage: 200 },
			{ window: 'q2', monthlyAverage: 200 },
			{ window: 'q4', monthlyAverage: 200 }
		)
	);
	assert.equal(output.highestWindow, 'h1');

	const repeat = analyzeDemandWave(
		windows(
			{ window: 'h1', monthlyAverage: 200 },
			{ window: 'q2', monthlyAverage: 200 },
			{ window: 'q4', monthlyAverage: 200 }
		)
	);
	assert.equal(repeat.highestWindow, output.highestWindow);
});

test('a single provided window still produces a full result', () => {
	const output = analyzeDemandWave(windows({ window: 'q1', monthlyAverage: 42 }));
	assert.equal(output.windows.length, 1);
	assert.equal(output.highestMonthlyAverage, 42);
	assert.equal(output.highestWindow, 'q1');
	assert.equal(output.defensiveCoverage, 126);
});

test('all-zero windows produce zero coverage rather than an undefined result', () => {
	const output = analyzeDemandWave(
		windows({ window: 'annual', monthlyAverage: 0 }, { window: 'q1', monthlyAverage: 0 })
	);
	assert.equal(output.highestMonthlyAverage, 0);
	assert.equal(output.defensiveCoverage, 0);
	assert.equal(output.highestWindow, 'annual');
});

test('the coverage multiplier is a declared threshold, not a literal', () => {
	const input = windows({ window: 'annual', monthlyAverage: 100 });
	const custom = analyzeDemandWave(input, { defensiveCoverageMonths: 2 });
	assert.equal(custom.defensiveCoverage, 200);
	assert.equal(custom.defensiveCoverageMonths, 2);
	assert.equal(DEFAULT_DEMAND_WAVE_THRESHOLDS.defensiveCoverageMonths, 3);
});

test('the engine is pure — the same input twice gives a deeply equal result', () => {
	const input = windows(
		{ window: 'annual', monthlyAverage: 100 },
		{ window: 'q3', monthlyAverage: 180 }
	);
	assert.deepEqual(analyzeDemandWave(input), analyzeDemandWave(input));
});

test('the engine emits no classification, status, or narrative code', () => {
	const output = analyzeDemandWave(windows({ window: 'annual', monthlyAverage: 100 }));
	assert.deepEqual(Object.keys(output).sort(), [
		'defensiveCoverage',
		'defensiveCoverageMonths',
		'highestMonthlyAverage',
		'highestWindow',
		'windows',
	]);
});
