import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeBufferDrift } from '../../../tools/buffer-drift-monitor/analyze.ts';
import { validateBufferDriftInput } from '../../../tools/buffer-drift-monitor/validate.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import { bufferDriftQuickAdapter } from './quick-adapter.ts';

function confirmed(records: ConfirmedIntake['records']): ConfirmedIntake {
	return { schemaId: 'buffer-drift-quick', confirmedAt: '2026-07-19T00:00:00.000Z', records };
}

test('maps confirmed fields onto the instrument raw input', () => {
	const outcome = bufferDriftQuickAdapter(
		confirmed([{ itemName: 'widget', monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 16 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const { itemName, input } = outcome.data[0];
		assert.equal(itemName, 'widget');
		assert.deepEqual(input, { monthlyConsumption: '20', intendedBufferMonths: '1', actualBufferQuantity: '16' });
	}
});

test('blank itemName defaults to "item"', () => {
	const outcome = bufferDriftQuickAdapter(confirmed([{ monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 16 }]));
	assert.equal(outcome.ok, true);
	if (outcome.ok) assert.equal(outcome.data[0].itemName, 'item');
});

test('adapter output feeds the UNCHANGED instrument pipeline end-to-end', () => {
	const outcome = bufferDriftQuickAdapter(
		confirmed([{ itemName: 'widget', monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 16 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const validated = validateBufferDriftInput(outcome.data[0].input);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const output = analyzeBufferDrift(validated.data);
			assert.equal(output.status, 'under-buffered');
		}
	}
});

test('instrument validation stays authoritative — adapter passes bad values through raw', () => {
	const outcome = bufferDriftQuickAdapter(confirmed([{ itemName: 'widget', monthlyConsumption: -5, intendedBufferMonths: 1, actualBufferQuantity: 16 }]));
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const validated = validateBufferDriftInput(outcome.data[0].input);
		assert.equal(validated.valid, false);
	}
});

test('empty confirmed intake is refused', () => {
	const outcome = bufferDriftQuickAdapter(confirmed([]));
	assert.equal(outcome.ok, false);
});
