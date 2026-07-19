// The Reusable Data Loop, end to end in Node: manual values → input CSV
// → parse → map → validate → confirm → adapter → engine → result — and
// the exported result CSV must NOT be mappable as an input CSV. Mirrors
// Water Level's reusable-loop.test.ts (Sprint 007 Instrument Factory
// verification: the platform's CSV loop needed zero changes).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeLeadTimeGap } from '../../../tools/lead-time-gap-checker/analyze.ts';
import { leadTimeGapProjectionToCsv, leadTimeGapQuickResultsToCsv } from '../../../tools/lead-time-gap-checker/export.ts';
import { leadTimeGapAdvancedSchema } from '../../../tools/lead-time-gap-checker/modes/advanced/schema.ts';
import { leadTimeGapAdvancedTemplate } from '../../../tools/lead-time-gap-checker/modes/advanced/template.ts';
import { leadTimeGapQuickSchema } from '../../../tools/lead-time-gap-checker/modes/quick/schema.ts';
import { leadTimeGapQuickTemplate } from '../../../tools/lead-time-gap-checker/modes/quick/template.ts';
import { computeLeadTimeGapProjection } from '../../../tools/lead-time-gap-checker/projection.ts';
import { validateLeadTimeGapInput } from '../../../tools/lead-time-gap-checker/validate.ts';
import { confirmIntake } from '../../intake/confirm.ts';
import { parseCsv } from '../../intake/csv.ts';
import { applyMapping, suggestMapping, validateMapping } from '../../intake/mapping.ts';
import type { IntakeSchema } from '../../intake/types.ts';
import { validateRecords } from '../../intake/validate.ts';
import { generateBlankTemplateCsv, generateInputCsv } from '../../templates/generate-csv-template.ts';
import { leadTimeGapAdvancedAdapter } from './advanced-adapter.ts';
import { leadTimeGapQuickAdapter } from './quick-adapter.ts';

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

test('QUICK LOOP: exported input CSV re-imports and reproduces the same gap assessment', () => {
	const values = {
		itemName: 'widget',
		currentStock: '100',
		monthlyConsumption: '10',
		leadTimeMonths: '9.5',
		safetyBufferMonths: '1',
		currentDate: '2026-01-01',
	};
	const inputCsv = generateInputCsv(leadTimeGapQuickTemplate, [values]);
	const confirmed = runIntake(inputCsv, leadTimeGapQuickSchema);
	const adapted = leadTimeGapQuickAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const validated = validateLeadTimeGapInput(adapted.data[0].input);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const output = analyzeLeadTimeGap(validated.data);
			assert.equal(output.risk, 'gap-risk');
			assert.equal(output.gap, true);
			// Result export works and stays a RESULT file.
			const resultCsv = leadTimeGapQuickResultsToCsv([{ itemName: 'widget', output }]);
			assert.ok(resultCsv.startsWith('item,coverageMonths'));
		}
	}
});

test('ADVANCED LOOP: exported input CSV re-imports and projects gap windows correctly', () => {
	const rows = [
		{ itemName: 'a', period: '1', beginningInventory: '100', supplierLeadTimeMonths: '4', safetyBufferMonths: '2', consumption: '25', arrivalQuantity: '' },
		{ itemName: 'a', period: '2', beginningInventory: '', supplierLeadTimeMonths: '', safetyBufferMonths: '', consumption: '25', arrivalQuantity: '' },
		{ itemName: 'a', period: '3', beginningInventory: '', supplierLeadTimeMonths: '', safetyBufferMonths: '', consumption: '25', arrivalQuantity: '' },
	];
	const inputCsv = generateInputCsv(leadTimeGapAdvancedTemplate, rows);
	const confirmed = runIntake(inputCsv, leadTimeGapAdvancedSchema);
	const adapted = leadTimeGapAdvancedAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const projection = computeLeadTimeGapProjection(adapted.data);
		const a = projection.items.find((item) => item.name === 'a');
		assert.equal(a?.firstBufferBreachPeriod, 3);
		assert.equal(a?.expectedArrivalPeriod, 4);
		assert.equal(a?.riskLevel, 'gap-window');
		const resultCsv = leadTimeGapProjectionToCsv(projection);
		assert.ok(resultCsv.includes('a,3,0,25,25,yes,no,4,yes,gap-window'));
	}
});

test('blank templates run the full loop directly', () => {
	const quickConfirmed = runIntake(generateBlankTemplateCsv(leadTimeGapQuickTemplate), leadTimeGapQuickSchema);
	assert.equal(leadTimeGapQuickAdapter(quickConfirmed).ok, true);

	const advancedConfirmed = runIntake(generateBlankTemplateCsv(leadTimeGapAdvancedTemplate), leadTimeGapAdvancedSchema);
	assert.equal(leadTimeGapAdvancedAdapter(advancedConfirmed).ok, true);
});

test('RESULT CSVs cannot be mistaken for input CSVs — mapping fails required fields', () => {
	const quickResult = leadTimeGapQuickResultsToCsv([
		{
			itemName: 'widget',
			output: analyzeLeadTimeGap({
				currentStock: 100,
				monthlyConsumption: 10,
				leadTimeMonths: 1,
				safetyBufferMonths: 1,
				currentDate: '2026-01-01',
			}),
		},
	]);
	const parsedQuick = parseCsv(quickResult);
	const quickMapping = suggestMapping(parsedQuick.headers, leadTimeGapQuickSchema);
	assert.ok(validateMapping(quickMapping, leadTimeGapQuickSchema).some((issue) => issue.severity === 'error'));

	const advancedResult = leadTimeGapProjectionToCsv(
		computeLeadTimeGapProjection({
			items: [
				{
					name: 'a',
					beginningInventory: 100,
					supplierLeadTimeMonths: undefined,
					safetyBufferMonths: undefined,
					periods: [{ period: 1, consumption: 30, arrivalQuantity: 0 }],
				},
			],
		})
	);
	const parsedAdvanced = parseCsv(advancedResult);
	const advancedMapping = suggestMapping(parsedAdvanced.headers, leadTimeGapAdvancedSchema);
	assert.ok(validateMapping(advancedMapping, leadTimeGapAdvancedSchema).some((issue) => issue.severity === 'error'));
});

test('quick schema surfaces blank currentDate as an info notice, not an error', () => {
	const csv = generateInputCsv(leadTimeGapQuickTemplate, [
		{ itemName: 'w', currentStock: '10', monthlyConsumption: '5', leadTimeMonths: '1', safetyBufferMonths: '1', currentDate: '' },
	]);
	const parsed = parseCsv(csv);
	const mapping = suggestMapping(parsed.headers, leadTimeGapQuickSchema);
	const result = validateRecords(applyMapping(parsed, mapping), leadTimeGapQuickSchema);
	assert.equal(result.errorCount, 0);
	assert.equal(result.warningCount, 0);
	assert.equal(result.infoCount, 1);
	assert.ok(result.issues.some((issue) => issue.code === 'LEAD_TIME_CURRENT_DATE_DEFAULTED'));
});
