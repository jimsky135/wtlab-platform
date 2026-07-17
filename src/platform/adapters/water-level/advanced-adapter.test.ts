import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeRollingProjection } from '../../../tools/inventory-buffer-check/projection.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import { advancedAdapter } from './advanced-adapter.ts';

function confirmed(records: ConfirmedIntake['records']): ConfirmedIntake {
	return { schemaId: 'water-level-advanced', confirmedAt: '2026-07-17T00:00:00.000Z', records };
}

test('groups rows by item, sorts periods, lifts item-level values from first declaring row', () => {
	const outcome = advancedAdapter(
		confirmed([
			{ itemName: 'a', period: 2, consumption: 30, arrivalQuantity: 50 },
			{ itemName: 'a', period: 1, beginningInventory: 100, safetyBufferMonths: 1, consumption: 30 },
			{ itemName: 'b', period: 1, beginningInventory: 60, consumption: 40 },
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		assert.equal(outcome.data.items.length, 2);
		const a = outcome.data.items.find((item) => item.name === 'a');
		assert.ok(a);
		assert.equal(a.beginningInventory, 100);
		assert.equal(a.safetyBufferMonths, 1);
		assert.deepEqual(
			a.periods.map((p) => p.period),
			[1, 2]
		);
		assert.equal(a.periods[1].arrivalQuantity, 50);
		const b = outcome.data.items.find((item) => item.name === 'b');
		assert.equal(b?.safetyBufferMonths, undefined);
	}
});

test('duplicate item+period rows are a structural error', () => {
	const outcome = advancedAdapter(
		confirmed([
			{ itemName: 'a', period: 1, beginningInventory: 100, consumption: 30 },
			{ itemName: 'a', period: 1, consumption: 20 },
		])
	);
	assert.equal(outcome.ok, false);
	if (!outcome.ok) {
		assert.ok(outcome.issues.some((issue) => issue.message.includes('more than one row for period 1')));
	}
});

test('item with no beginning inventory anywhere is a structural error', () => {
	const outcome = advancedAdapter(confirmed([{ itemName: 'a', period: 1, consumption: 30 }]));
	assert.equal(outcome.ok, false);
	if (!outcome.ok) {
		assert.ok(outcome.issues.some((issue) => issue.field === 'beginningInventory'));
	}
});

test('adapter contains no math — projection over adapted input matches direct projection', () => {
	const outcome = advancedAdapter(
		confirmed([
			{ itemName: 'a', period: 1, beginningInventory: 100, consumption: 30 },
			{ itemName: 'a', period: 2, consumption: 30, arrivalQuantity: 50 },
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const projected = computeRollingProjection(outcome.data);
		assert.deepEqual(
			projected.items[0].periods.map((p) => p.endingBalance),
			[70, 90]
		);
	}
});

test('empty confirmed intake is refused', () => {
	const outcome = advancedAdapter(confirmed([]));
	assert.equal(outcome.ok, false);
});
