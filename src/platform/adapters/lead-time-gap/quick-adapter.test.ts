import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeLeadTimeGap } from '../../../tools/lead-time-gap-checker/analyze.ts';
import { validateLeadTimeGapInput } from '../../../tools/lead-time-gap-checker/validate.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import { leadTimeGapQuickAdapter } from './quick-adapter.ts';

function confirmed(records: ConfirmedIntake['records']): ConfirmedIntake {
	return { schemaId: 'lead-time-gap-quick', confirmedAt: '2026-07-19T00:00:00.000Z', records };
}

test('maps confirmed fields onto the instrument raw input with month units', () => {
	const outcome = leadTimeGapQuickAdapter(
		confirmed([
			{
				itemName: 'widget',
				currentStock: 100,
				monthlyConsumption: 10,
				leadTimeMonths: 1,
				safetyBufferMonths: 1,
				currentDate: '2026-01-01',
			},
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const { itemName, input } = outcome.data[0];
		assert.equal(itemName, 'widget');
		assert.deepEqual(input, {
			currentStock: '100',
			monthlyConsumption: '10',
			leadTime: '1',
			leadTimeUnit: 'month',
			safetyBuffer: '1',
			safetyBufferUnit: 'month',
			currentDate: '2026-01-01',
		});
	}
});

test('blank itemName defaults to "item"', () => {
	const outcome = leadTimeGapQuickAdapter(confirmed([{ currentStock: 10, monthlyConsumption: 5 }]));
	assert.equal(outcome.ok, true);
	if (outcome.ok) assert.equal(outcome.data[0].itemName, 'item');
});

test('adapter output feeds the UNCHANGED instrument pipeline end-to-end', () => {
	const outcome = leadTimeGapQuickAdapter(
		confirmed([
			{ itemName: 'widget', currentStock: 100, monthlyConsumption: 10, leadTimeMonths: 9.5, safetyBufferMonths: 1, currentDate: '2026-01-01' },
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const validated = validateLeadTimeGapInput(outcome.data[0].input);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const output = analyzeLeadTimeGap(validated.data);
			assert.equal(output.risk, 'gap-risk');
		}
	}
});

test('instrument validation stays authoritative — adapter passes bad values through raw', () => {
	const outcome = leadTimeGapQuickAdapter(confirmed([{ itemName: 'widget', currentStock: -5, monthlyConsumption: 10 }]));
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const validated = validateLeadTimeGapInput(outcome.data[0].input);
		assert.equal(validated.valid, false);
	}
});

test('empty confirmed intake is refused', () => {
	const outcome = leadTimeGapQuickAdapter(confirmed([]));
	assert.equal(outcome.ok, false);
});
