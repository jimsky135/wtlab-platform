import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateInventoryBuffer } from '../../../tools/inventory-buffer-check/calculate.ts';
import { validateInventoryBufferInput } from '../../../tools/inventory-buffer-check/validate.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import { quickAdapter } from './quick-adapter.ts';

function confirmed(records: ConfirmedIntake['records']): ConfirmedIntake {
	return { schemaId: 'water-level-quick', confirmedAt: '2026-07-17T00:00:00.000Z', records };
}

test('maps confirmed fields onto the instrument raw input with month units', () => {
	const outcome = quickAdapter(
		confirmed([
			{
				itemName: 'widget',
				currentStock: 25,
				monthlyConsumption: 10,
				leadTimeMonths: 2,
				safetyBufferMonths: 1,
				inTransitQuantity: 50,
				arrivalTimeMonths: 2,
			},
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const { itemName, input } = outcome.data[0];
		assert.equal(itemName, 'widget');
		assert.deepEqual(input, {
			currentStock: '25',
			monthlyConsumption: '10',
			leadTime: '2',
			leadTimeUnit: 'month',
			safetyBuffer: '1',
			safetyBufferUnit: 'month',
			inTransitQuantity: '50',
			arrivalTime: '2',
			arrivalTimeUnit: 'month',
		});
	}
});

test('blank optional lead time and safety buffer default to 0; optional in-transit stays absent', () => {
	const outcome = quickAdapter(
		confirmed([{ itemName: 'widget', currentStock: 25, monthlyConsumption: 10 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const { input } = outcome.data[0];
		assert.equal(input.leadTime, '0');
		assert.equal(input.safetyBuffer, '0');
		assert.equal(input.inTransitQuantity, undefined);
		assert.equal(input.arrivalTime, undefined);
	}
});

test('adapter output feeds the UNCHANGED instrument pipeline end-to-end', () => {
	const outcome = quickAdapter(
		confirmed([
			{ itemName: 'widget', currentStock: 25, monthlyConsumption: 10, leadTimeMonths: 2, safetyBufferMonths: 1 },
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const validated = validateInventoryBufferInput(outcome.data[0].input);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const output = calculateInventoryBuffer(validated.data);
			assert.equal(output.currentCoverageMonths, 2.5);
			assert.equal(output.riskStatus, 'caution');
		}
	}
});

test('instrument validation stays authoritative — adapter passes bad values through raw', () => {
	const outcome = quickAdapter(confirmed([{ itemName: 'widget', currentStock: 25, monthlyConsumption: 0 }]));
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const validated = validateInventoryBufferInput(outcome.data[0].input);
		assert.equal(validated.valid, false);
	}
});

test('empty confirmed intake is refused', () => {
	const outcome = quickAdapter(confirmed([]));
	assert.equal(outcome.ok, false);
});
