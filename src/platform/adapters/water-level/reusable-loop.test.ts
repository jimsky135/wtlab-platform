// The Reusable Data Loop, end to end in Node: manual values → input CSV
// → parse → map → validate → confirm → adapter → engine → result — and
// the exported result CSV must NOT be mappable as an input CSV.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateInventoryBuffer } from '../../../tools/inventory-buffer-check/calculate.ts';
import { projectionToCsv, quickResultsToCsv } from '../../../tools/inventory-buffer-check/export.ts';
import { advancedIntakeSchema } from '../../../tools/inventory-buffer-check/modes/advanced/schema.ts';
import { advancedCsvTemplate } from '../../../tools/inventory-buffer-check/modes/advanced/template.ts';
import { quickIntakeSchema } from '../../../tools/inventory-buffer-check/modes/quick/schema.ts';
import { quickCsvTemplate } from '../../../tools/inventory-buffer-check/modes/quick/template.ts';
import { computeRollingProjection } from '../../../tools/inventory-buffer-check/projection.ts';
import { validateInventoryBufferInput } from '../../../tools/inventory-buffer-check/validate.ts';
import { confirmIntake } from '../../intake/confirm.ts';
import { parseCsv } from '../../intake/csv.ts';
import { applyMapping, suggestMapping, validateMapping } from '../../intake/mapping.ts';
import type { IntakeSchema } from '../../intake/types.ts';
import { validateRecords } from '../../intake/validate.ts';
import { generateBlankTemplateCsv, generateInputCsv } from '../../templates/generate-csv-template.ts';
import { advancedAdapter } from './advanced-adapter.ts';
import { quickAdapter } from './quick-adapter.ts';

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

test('QUICK LOOP: exported input CSV re-imports and reproduces the same engine result', () => {
	const values = {
		itemName: 'widget',
		currentStock: '25',
		monthlyConsumption: '10',
		leadTimeMonths: '2',
		safetyBufferMonths: '1',
		inTransitQuantity: '50',
		arrivalTimeMonths: '',
	};
	const inputCsv = generateInputCsv(quickCsvTemplate, [values]);
	const confirmed = runIntake(inputCsv, quickIntakeSchema);
	const adapted = quickAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const validated = validateInventoryBufferInput(adapted.data[0].input);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const output = calculateInventoryBuffer(validated.data);
			assert.equal(output.currentCoverageMonths, 2.5);
			assert.equal(output.totalCoverageMonths, 7.5);
			assert.equal(output.riskStatus, 'caution');
			// Result export works and stays a RESULT file.
			const resultCsv = quickResultsToCsv([{ itemName: 'widget', output }]);
			assert.ok(resultCsv.startsWith('item,currentCoverageMonths'));
		}
	}
});

test('ADVANCED LOOP: exported input CSV re-imports and projects correctly', () => {
	const rows = [
		{ itemName: 'a', period: '1', beginningInventory: '100', safetyBufferMonths: '1', consumption: '30', arrivalQuantity: '' },
		{ itemName: 'a', period: '2', beginningInventory: '', safetyBufferMonths: '', consumption: '30', arrivalQuantity: '50' },
		{ itemName: 'b', period: '1', beginningInventory: '20', safetyBufferMonths: '', consumption: '40', arrivalQuantity: '' },
	];
	const inputCsv = generateInputCsv(advancedCsvTemplate, rows);
	const confirmed = runIntake(inputCsv, advancedIntakeSchema);
	const adapted = advancedAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const projection = computeRollingProjection(adapted.data);
		const a = projection.items.find((item) => item.name === 'a');
		assert.deepEqual(a?.periods.map((p) => p.endingBalance), [70, 90]);
		const b = projection.items.find((item) => item.name === 'b');
		assert.equal(b?.firstShortagePeriod, 1);
		assert.equal(projection.riskRanking[0], 'b');
		const resultCsv = projectionToCsv(projection);
		assert.ok(resultCsv.includes('a,1,0,30,70,no,no,ok'));
	}
});

test('blank templates run the full loop directly (Flow C)', () => {
	const quickConfirmed = runIntake(generateBlankTemplateCsv(quickCsvTemplate), quickIntakeSchema);
	assert.equal(quickAdapter(quickConfirmed).ok, true);

	const advancedConfirmed = runIntake(generateBlankTemplateCsv(advancedCsvTemplate), advancedIntakeSchema);
	assert.equal(advancedAdapter(advancedConfirmed).ok, true);
});

test('RESULT CSVs cannot be mistaken for input CSVs — mapping fails required fields', () => {
	const quickResult = quickResultsToCsv([
		{
			itemName: 'widget',
			output: {
				currentCoverageMonths: 2.5,
				totalCoverageMonths: undefined,
				minimumSafetyStock: 10,
				reorderPoint: 30,
				arrivalRisk: 'arrival-time-not-provided',
				riskStatus: 'caution',
			},
		},
	]);
	const parsedQuick = parseCsv(quickResult);
	const quickMapping = suggestMapping(parsedQuick.headers, quickIntakeSchema);
	assert.ok(validateMapping(quickMapping, quickIntakeSchema).some((issue) => issue.severity === 'error'));

	const advancedResult = projectionToCsv(
		computeRollingProjection({
			items: [
				{
					name: 'a',
					beginningInventory: 100,
					safetyBufferMonths: undefined,
					periods: [{ period: 1, consumption: 30, arrivalQuantity: 0 }],
				},
			],
		})
	);
	const parsedAdvanced = parseCsv(advancedResult);
	const advancedMapping = suggestMapping(parsedAdvanced.headers, advancedIntakeSchema);
	assert.ok(validateMapping(advancedMapping, advancedIntakeSchema).some((issue) => issue.severity === 'error'));
});

test('quick schema surfaces blank lead time / buffer as warnings, not errors', () => {
	const csv = generateInputCsv(quickCsvTemplate, [
		{ itemName: 'w', currentStock: '10', monthlyConsumption: '5', leadTimeMonths: '', safetyBufferMonths: '', inTransitQuantity: '', arrivalTimeMonths: '' },
	]);
	const parsed = parseCsv(csv);
	const mapping = suggestMapping(parsed.headers, quickIntakeSchema);
	const result = validateRecords(applyMapping(parsed, mapping), quickIntakeSchema);
	assert.equal(result.errorCount, 0);
	assert.equal(result.warningCount, 2);
});
