// Third instrument's Reusable Data Loop plus adapter behavior, end to
// end in Node — same guarantees as the first two instruments.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeDeadStock } from '../../../tools/dead-stock-scanner/analyze.ts';
import { deadStockResultToCsv } from '../../../tools/dead-stock-scanner/export.ts';
import { deadStockAdvancedSchema } from '../../../tools/dead-stock-scanner/modes/advanced/schema.ts';
import { deadStockAdvancedTemplate } from '../../../tools/dead-stock-scanner/modes/advanced/template.ts';
import { deadStockQuickSchema } from '../../../tools/dead-stock-scanner/modes/quick/schema.ts';
import { deadStockQuickTemplate } from '../../../tools/dead-stock-scanner/modes/quick/template.ts';
import { DEFAULT_THRESHOLDS } from '../../../tools/dead-stock-scanner/types.ts';
import { validateDeadStockInput } from '../../../tools/dead-stock-scanner/validate.ts';
import { confirmIntake } from '../../intake/confirm.ts';
import { parseCsv } from '../../intake/csv.ts';
import { applyMapping, suggestMapping, validateMapping } from '../../intake/mapping.ts';
import type { ConfirmedIntake, IntakeSchema } from '../../intake/types.ts';
import { validateRecords } from '../../intake/validate.ts';
import { generateBlankTemplateCsv, generateInputCsv } from '../../templates/generate-csv-template.ts';
import { deadStockAdvancedAdapter } from './advanced-adapter.ts';
import { deadStockQuickAdapter } from './quick-adapter.ts';

function confirmed(records: ConfirmedIntake['records']): ConfirmedIntake {
	return { schemaId: 'dead-stock-quick', confirmedAt: '2026-07-18T00:00:00.000Z', records };
}

function runIntake(csv: string, schema: IntakeSchema) {
	const parsed = parseCsv(csv);
	assert.equal(parsed.ok, true, 'input CSV must parse');
	const mapping = suggestMapping(parsed.headers, schema);
	assert.equal(validateMapping(mapping, schema).length, 0, 'input CSV must map exactly');
	const result = validateRecords(applyMapping(parsed, mapping), schema);
	assert.equal(result.errorCount, 0, 'input CSV must validate without errors');
	const outcome = confirmIntake(schema, result);
	assert.equal(outcome.confirmed, true);
	return outcome.confirmed ? outcome.data : (() => { throw new Error('unreachable'); })();
}

test('quick adapter maps fields; missing optionals stay undefined (never defaulted to 0)', () => {
	const outcome = deadStockQuickAdapter(
		confirmed([{ item: 'a', currentStock: 800, recentMonthlyConsumption: 10 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const first = outcome.data.items[0];
		assert.equal(first.monthsSinceLastMovement, undefined);
		assert.equal(first.futureDemand, undefined);
		assert.equal(first.unitCost, undefined);
		assert.deepEqual(outcome.data.thresholds, DEFAULT_THRESHOLDS);
	}
});

test('quick adapter wires the declared thresholdMonths override', () => {
	const outcome = deadStockQuickAdapter(
		confirmed([{ item: 'a', currentStock: 800, recentMonthlyConsumption: 10, thresholdMonths: 6 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		assert.equal(outcome.data.thresholds.highCoverageMonths, 6);
		assert.equal(outcome.data.thresholds.excessCoverageMonths, 12);
	}
});

test('adapters contain no classification — engine over adapted input matches direct input', () => {
	const outcome = deadStockAdvancedAdapter(
		confirmed([{ item: 'a', currentStock: 500, recentMonthlyConsumption: 0, monthsSinceLastMovement: 14, futureDemand: 0 }])
	);
	assert.equal(outcome.ok, true);
	if (outcome.ok) {
		const viaAdapter = analyzeDeadStock(outcome.data);
		const direct = analyzeDeadStock({
			items: [
				{
					item: 'a',
					currentStock: 500,
					recentMonthlyConsumption: 0,
					monthsSinceLastMovement: 14,
					futureDemand: 0,
					unitCost: undefined,
					category: undefined,
				},
			],
			thresholds: DEFAULT_THRESHOLDS,
		});
		assert.deepEqual(viaAdapter, direct);
	}
});

test('DEAD STOCK QUICK LOOP: exported input CSV re-imports and reproduces the verdict', () => {
	const rows = [
		{ item: 'widget', currentStock: '500', recentMonthlyConsumption: '0', monthsSinceLastMovement: '14', futureDemand: '0', unitCost: '12', thresholdMonths: '' },
	];
	const data = runIntake(generateInputCsv(deadStockQuickTemplate, rows), deadStockQuickSchema);
	const adapted = deadStockQuickAdapter(data);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const validated = validateDeadStockInput(adapted.data);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const analysis = analyzeDeadStock(validated.data);
			assert.equal(analysis.items[0].classification, 'dead-stock');
			assert.equal(analysis.items[0].exposureValue, 6000);
		}
	}
});

test('DEAD STOCK ADVANCED LOOP: portfolio summary from re-imported CSV', () => {
	const rows = [
		{ item: 'a', currentStock: '90', recentMonthlyConsumption: '30', monthsSinceLastMovement: '0', futureDemand: '', unitCost: '', category: '', note: '' },
		{ item: 'b', currentStock: '100', recentMonthlyConsumption: '0', monthsSinceLastMovement: '15', futureDemand: '0', unitCost: '5', category: 'spare', note: '' },
		{ item: 'c', currentStock: '300', recentMonthlyConsumption: '10', monthsSinceLastMovement: '1', futureDemand: '', unitCost: '2', category: '', note: '' },
	];
	const data = runIntake(generateInputCsv(deadStockAdvancedTemplate, rows), deadStockAdvancedSchema);
	const adapted = deadStockAdvancedAdapter(data);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const analysis = analyzeDeadStock(adapted.data);
		assert.equal(analysis.summary.totalItems, 3);
		assert.equal(analysis.summary.counts['dead-stock'], 1);
		assert.equal(analysis.summary.counts['excess-exposure'], 1);
		assert.equal(analysis.summary.counts.healthy, 1);
		assert.deepEqual(analysis.summary.topRiskItems, ['b', 'c']);
		const resultCsv = deadStockResultToCsv(analysis);
		assert.ok(resultCsv.includes('b,dead-stock'));
	}
});

test('blank dead-stock templates run the full loop directly', () => {
	const quick = runIntake(generateBlankTemplateCsv(deadStockQuickTemplate), deadStockQuickSchema);
	assert.equal(deadStockQuickAdapter(quick).ok, true);
	const advanced = runIntake(generateBlankTemplateCsv(deadStockAdvancedTemplate), deadStockAdvancedSchema);
	assert.equal(deadStockAdvancedAdapter(advanced).ok, true);
});

test('optional-field warnings surface without blocking (consumption 0, missing demand/cost)', () => {
	const csv = generateInputCsv(deadStockQuickTemplate, [
		{ item: 'w', currentStock: '10', recentMonthlyConsumption: '0', monthsSinceLastMovement: '', futureDemand: '', unitCost: '', thresholdMonths: '' },
	]);
	const parsed = parseCsv(csv);
	const mapping = suggestMapping(parsed.headers, deadStockQuickSchema);
	const result = validateRecords(applyMapping(parsed, mapping), deadStockQuickSchema);
	assert.equal(result.errorCount, 0);
	assert.equal(result.warningCount, 4); // no consumption, unknown demand, no unit cost, default thresholds
});

test('blocking errors: negative stock and invalid numerics fail intake', () => {
	const csv = generateInputCsv(deadStockQuickTemplate, [
		{ item: 'w', currentStock: '-5', recentMonthlyConsumption: 'abc', monthsSinceLastMovement: '', futureDemand: '', unitCost: '', thresholdMonths: '' },
	]);
	const parsed = parseCsv(csv);
	const mapping = suggestMapping(parsed.headers, deadStockQuickSchema);
	const result = validateRecords(applyMapping(parsed, mapping), deadStockQuickSchema);
	assert.ok(result.errorCount >= 2);
});

test('dead-stock RESULT CSV cannot be mistaken for an input CSV', () => {
	const analysis = analyzeDeadStock({
		items: [
			{ item: 'a', currentStock: 10, recentMonthlyConsumption: 1, monthsSinceLastMovement: 0, futureDemand: undefined, unitCost: undefined, category: undefined },
		],
		thresholds: DEFAULT_THRESHOLDS,
	});
	const parsed = parseCsv(deadStockResultToCsv(analysis));
	for (const schema of [deadStockQuickSchema, deadStockAdvancedSchema]) {
		const mapping = suggestMapping(parsed.headers, schema);
		assert.ok(validateMapping(mapping, schema).some((issue) => issue.severity === 'error'));
	}
});

test('empty confirmed intake is refused by both adapters', () => {
	assert.equal(deadStockQuickAdapter(confirmed([])).ok, false);
	assert.equal(deadStockAdvancedAdapter(confirmed([])).ok, false);
});
