import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeBufferDriftProjection } from '../../../tools/buffer-drift-monitor/projection.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import { bufferDriftAdvancedAdapter } from './advanced-adapter.ts';

function confirmed(records: ConfirmedIntake['records']): ConfirmedIntake {
	return { schemaId: 'buffer-drift-advanced', confirmedAt: '2026-07-19T00:00:00.000Z', records };
}

test('groups rows by item, sorts periods, lifts item-level intended buffer from first declaring row', () => {
	const outcome = bufferDriftAdvancedAdapter(
		confirmed([
			{ itemName: 'a', period: 2, monthlyConsumption: 20, actualBufferQuantity: 10 },
			{ itemName: 'a', period: 1, intendedBufferMonths: 1, monthlyConsumption: 20, actualBufferQuantity: 20 },
			{ itemName: 'b', period: 1, intendedBufferMonths: 2, monthlyConsumption: 10, actualBufferQuantity: 20 },
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		assert.equal(outcome.data.items.length, 2);
		const a = outcome.data.items.find((item) => item.name === 'a');
		assert.ok(a);
		assert.equal(a.intendedBufferMonths, 1);
		assert.deepEqual(a.periods.map((p) => p.period), [1, 2]);
	}
});

test('duplicate item+period rows are a structural error (reuses the shared DUPLICATE_PERIOD_FOR_ITEM code)', () => {
	const outcome = bufferDriftAdvancedAdapter(
		confirmed([
			{ itemName: 'a', period: 1, intendedBufferMonths: 1, monthlyConsumption: 20, actualBufferQuantity: 20 },
			{ itemName: 'a', period: 1, monthlyConsumption: 20, actualBufferQuantity: 15 },
		])
	);
	assert.equal(outcome.ok, false);
	if (!outcome.ok) assert.ok(outcome.issues.some((issue) => issue.code === 'DUPLICATE_PERIOD_FOR_ITEM'));
});

test('item with no intended buffer declared anywhere is a structural error', () => {
	const outcome = bufferDriftAdvancedAdapter(confirmed([{ itemName: 'a', period: 1, monthlyConsumption: 20, actualBufferQuantity: 20 }]));
	assert.equal(outcome.ok, false);
	if (!outcome.ok) assert.ok(outcome.issues.some((issue) => issue.code === 'ITEM_MISSING_INTENDED_BUFFER'));
});

test('adapter contains no math — projection over adapted input matches direct projection', () => {
	const outcome = bufferDriftAdvancedAdapter(
		confirmed([{ itemName: 'a', period: 1, intendedBufferMonths: 1, monthlyConsumption: 20, actualBufferQuantity: 16 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const projected = computeBufferDriftProjection(outcome.data);
		assert.equal(projected.items[0].latestStatus, 'under-buffered');
	}
});

test('empty confirmed intake is refused', () => {
	const outcome = bufferDriftAdvancedAdapter(confirmed([]));
	assert.equal(outcome.ok, false);
});
