// The Reusable Data Loop, end to end in Node: manual values → input CSV
// → parse → map → validate → confirm → adapter → engine → result — and
// the exported result CSV must NOT be mappable as an input CSV. Mirrors
// every prior instrument's reusable-loop.test.ts (Sprint 008: the CSV
// loop needed zero changes for the fifth instrument either).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeBufferDrift } from '../../../tools/buffer-drift-monitor/analyze.ts';
import { bufferDriftProjectionToCsv, bufferDriftQuickResultsToCsv } from '../../../tools/buffer-drift-monitor/export.ts';
import { bufferDriftAdvancedSchema } from '../../../tools/buffer-drift-monitor/modes/advanced/schema.ts';
import { bufferDriftAdvancedTemplate } from '../../../tools/buffer-drift-monitor/modes/advanced/template.ts';
import { bufferDriftQuickSchema } from '../../../tools/buffer-drift-monitor/modes/quick/schema.ts';
import { bufferDriftQuickTemplate } from '../../../tools/buffer-drift-monitor/modes/quick/template.ts';
import { computeBufferDriftProjection } from '../../../tools/buffer-drift-monitor/projection.ts';
import { validateBufferDriftInput } from '../../../tools/buffer-drift-monitor/validate.ts';
import { confirmIntake } from '../../intake/confirm.ts';
import { parseCsv } from '../../intake/csv.ts';
import { applyMapping, suggestMapping, validateMapping } from '../../intake/mapping.ts';
import type { IntakeSchema } from '../../intake/types.ts';
import { validateRecords } from '../../intake/validate.ts';
import { generateBlankTemplateCsv, generateInputCsv } from '../../templates/generate-csv-template.ts';
import { bufferDriftAdvancedAdapter } from './advanced-adapter.ts';
import { bufferDriftQuickAdapter } from './quick-adapter.ts';

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

test('QUICK LOOP: exported input CSV re-imports and reproduces the same drift assessment', () => {
	const values = { itemName: 'widget', monthlyConsumption: '20', intendedBufferMonths: '1', actualBufferQuantity: '5' };
	const inputCsv = generateInputCsv(bufferDriftQuickTemplate, [values]);
	const confirmed = runIntake(inputCsv, bufferDriftQuickSchema);
	const adapted = bufferDriftQuickAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const validated = validateBufferDriftInput(adapted.data[0].input);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const output = analyzeBufferDrift(validated.data);
			assert.equal(output.status, 'severely-under-buffered');
			const resultCsv = bufferDriftQuickResultsToCsv([{ itemName: 'widget', output }]);
			assert.ok(resultCsv.startsWith('item,intendedBufferQuantity'));
		}
	}
});

test('ADVANCED LOOP: exported input CSV re-imports and projects trend correctly', () => {
	const rows = [
		{ itemName: 'a', period: '1', intendedBufferMonths: '1', monthlyConsumption: '20', actualBufferQuantity: '20' },
		{ itemName: 'a', period: '2', intendedBufferMonths: '', monthlyConsumption: '20', actualBufferQuantity: '10' },
	];
	const inputCsv = generateInputCsv(bufferDriftAdvancedTemplate, rows);
	const confirmed = runIntake(inputCsv, bufferDriftAdvancedSchema);
	const adapted = bufferDriftAdvancedAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const projection = computeBufferDriftProjection(adapted.data);
		const a = projection.items.find((item) => item.name === 'a');
		assert.equal(a?.trend, 'widening');
		const resultCsv = bufferDriftProjectionToCsv(projection);
		assert.ok(resultCsv.includes('a,2,20,10,-50,severely-under-buffered,widening'));
	}
});

test('blank templates run the full loop directly', () => {
	const quickConfirmed = runIntake(generateBlankTemplateCsv(bufferDriftQuickTemplate), bufferDriftQuickSchema);
	assert.equal(bufferDriftQuickAdapter(quickConfirmed).ok, true);

	const advancedConfirmed = runIntake(generateBlankTemplateCsv(bufferDriftAdvancedTemplate), bufferDriftAdvancedSchema);
	assert.equal(bufferDriftAdvancedAdapter(advancedConfirmed).ok, true);
});

test('RESULT CSVs cannot be mistaken for input CSVs — mapping fails required fields', () => {
	const quickResult = bufferDriftQuickResultsToCsv([
		{
			itemName: 'widget',
			output: analyzeBufferDrift({ monthlyConsumption: 20, intendedBufferMonths: 1, actualBufferQuantity: 16 }),
		},
	]);
	const parsedQuick = parseCsv(quickResult);
	const quickMapping = suggestMapping(parsedQuick.headers, bufferDriftQuickSchema);
	assert.ok(validateMapping(quickMapping, bufferDriftQuickSchema).some((issue) => issue.severity === 'error'));

	const advancedResult = bufferDriftProjectionToCsv(
		computeBufferDriftProjection({
			items: [{ name: 'a', intendedBufferMonths: 1, periods: [{ period: 1, monthlyConsumption: 20, actualBufferQuantity: 16 }] }],
		})
	);
	const parsedAdvanced = parseCsv(advancedResult);
	const advancedMapping = suggestMapping(parsedAdvanced.headers, bufferDriftAdvancedSchema);
	assert.ok(validateMapping(advancedMapping, bufferDriftAdvancedSchema).some((issue) => issue.severity === 'error'));
});
