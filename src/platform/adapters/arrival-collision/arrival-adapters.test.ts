import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeArrivals } from '../../../tools/arrival-collision-detector/analyze.ts';
import type { ConfirmedIntake } from '../../intake/types.ts';
import { arrivalAdvancedAdapter } from './advanced-adapter.ts';
import { arrivalQuickAdapter } from './quick-adapter.ts';

function confirmed(schemaId: string, records: ConfirmedIntake['records']): ConfirmedIntake {
	return { schemaId, confirmedAt: '2026-07-17T00:00:00.000Z', records };
}

test('quick adapter converts ISO dates to month keys and passes labels through', () => {
	const outcome = arrivalQuickAdapter(
		confirmed('arrival-collision-quick', [
			{ arrivalDate: '2026-08-10', quantity: 500, container: 'C-01', supplier: 'sup-a' },
			{ arrivalDate: '2026-09-02', quantity: 150 },
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		assert.deepEqual(outcome.data.arrivals[0], {
			monthKey: '2026-08',
			quantity: 500,
			container: 'C-01',
			supplier: 'sup-a',
		});
		assert.equal(outcome.data.arrivals[1].container, undefined);
		assert.equal(outcome.data.monthlyCapacity, undefined);
	}
});

test('advanced adapter lifts monthly capacity from the first row that declares it', () => {
	const outcome = arrivalAdvancedAdapter(
		confirmed('arrival-collision-advanced', [
			{ arrivalDate: '2026-08-10', quantity: 500 },
			{ arrivalDate: '2026-08-20', quantity: 400, monthlyCapacity: 1200 },
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		assert.equal(outcome.data.monthlyCapacity, 1200);
	}
});

test('advanced adapter leaves capacity undefined when no row declares it', () => {
	const outcome = arrivalAdvancedAdapter(
		confirmed('arrival-collision-advanced', [{ arrivalDate: '2026-08-10', quantity: 500 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) assert.equal(outcome.data.monthlyCapacity, undefined);
});

test('adapters contain no analysis — engine over adapted input matches direct input', () => {
	const outcome = arrivalQuickAdapter(
		confirmed('arrival-collision-quick', [
			{ arrivalDate: '2026-08-10', quantity: 500 },
			{ arrivalDate: '2026-08-24', quantity: 400 },
			{ arrivalDate: '2026-09-05', quantity: 100 },
		])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const viaAdapter = analyzeArrivals(outcome.data);
		const direct = analyzeArrivals({
			arrivals: [
				{ monthKey: '2026-08', quantity: 500, container: undefined, supplier: undefined },
				{ monthKey: '2026-08', quantity: 400, container: undefined, supplier: undefined },
				{ monthKey: '2026-09', quantity: 100, container: undefined, supplier: undefined },
			],
			monthlyCapacity: undefined,
		});
		assert.deepEqual(viaAdapter, direct);
	}
});

test('empty confirmed intake is refused by both adapters', () => {
	assert.equal(arrivalQuickAdapter(confirmed('arrival-collision-quick', [])).ok, false);
	assert.equal(arrivalAdvancedAdapter(confirmed('arrival-collision-advanced', [])).ok, false);
});
