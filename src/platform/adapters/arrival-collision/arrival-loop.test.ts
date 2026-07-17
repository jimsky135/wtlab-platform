// Second instrument's Reusable Data Loop, end to end in Node — proving
// the platform pattern replicates: input CSV → shared intake → adapter
// → engine → result, with the same guarantees as Water Level.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeArrivals } from '../../../tools/arrival-collision-detector/analyze.ts';
import { arrivalResultToCsv } from '../../../tools/arrival-collision-detector/export.ts';
import { arrivalAdvancedSchema } from '../../../tools/arrival-collision-detector/modes/advanced/schema.ts';
import { arrivalAdvancedTemplate } from '../../../tools/arrival-collision-detector/modes/advanced/template.ts';
import { arrivalQuickSchema } from '../../../tools/arrival-collision-detector/modes/quick/schema.ts';
import { arrivalQuickTemplate } from '../../../tools/arrival-collision-detector/modes/quick/template.ts';
import { validateArrivalInput } from '../../../tools/arrival-collision-detector/validate.ts';
import { confirmIntake } from '../../intake/confirm.ts';
import { parseCsv } from '../../intake/csv.ts';
import { applyMapping, suggestMapping, validateMapping } from '../../intake/mapping.ts';
import type { IntakeSchema } from '../../intake/types.ts';
import { validateRecords } from '../../intake/validate.ts';
import { generateBlankTemplateCsv, generateInputCsv } from '../../templates/generate-csv-template.ts';
import { arrivalAdvancedAdapter } from './advanced-adapter.ts';
import { arrivalQuickAdapter } from './quick-adapter.ts';

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

test('ARRIVAL QUICK LOOP: exported input CSV re-imports and reproduces the analysis', () => {
	const rows = [
		{ arrivalDate: '2026-08-10', quantity: '500', container: 'C-01', supplier: 'sup-a' },
		{ arrivalDate: '2026-08-24', quantity: '400', container: 'C-02', supplier: 'sup-b' },
		{ arrivalDate: '2026-09-05', quantity: '100', container: '', supplier: '' },
	];
	const inputCsv = generateInputCsv(arrivalQuickTemplate, rows);
	const confirmed = runIntake(inputCsv, arrivalQuickSchema);
	const adapted = arrivalQuickAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const validated = validateArrivalInput(adapted.data);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const analysis = analyzeArrivals(validated.data);
			assert.equal(analysis.peakMonth, '2026-08');
			assert.equal(analysis.collisionLevel, 'severe'); // 900/1000 = 90% in one month
			const resultCsv = arrivalResultToCsv(analysis);
			assert.ok(resultCsv.startsWith('month,totalQuantity'));
			assert.ok(resultCsv.includes('2026-08,900,2,2,2,90,n/a,severe'));
		}
	}
});

test('ARRIVAL ADVANCED LOOP: capacity from CSV drives over-capacity detection', () => {
	const rows = [
		{ arrivalDate: '2026-08-10', quantity: '500', container: '', supplier: '', monthlyCapacity: '600' },
		{ arrivalDate: '2026-08-20', quantity: '400', container: '', supplier: '', monthlyCapacity: '' },
		{ arrivalDate: '2026-09-12', quantity: '300', container: '', supplier: '', monthlyCapacity: '' },
	];
	const inputCsv = generateInputCsv(arrivalAdvancedTemplate, rows);
	const confirmed = runIntake(inputCsv, arrivalAdvancedSchema);
	const adapted = arrivalAdvancedAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		assert.equal(adapted.data.monthlyCapacity, 600);
		const analysis = analyzeArrivals(adapted.data);
		assert.equal(analysis.months[0].overCapacity, true);
		assert.equal(analysis.collisionLevel, 'severe');
	}
});

test('blank arrival templates run the full loop directly', () => {
	const quickConfirmed = runIntake(generateBlankTemplateCsv(arrivalQuickTemplate), arrivalQuickSchema);
	assert.equal(arrivalQuickAdapter(quickConfirmed).ok, true);
	const advancedConfirmed = runIntake(generateBlankTemplateCsv(arrivalAdvancedTemplate), arrivalAdvancedSchema);
	assert.equal(arrivalAdvancedAdapter(advancedConfirmed).ok, true);
});

test('non-ISO arrival dates are blocking errors at intake', () => {
	const csv = generateInputCsv(arrivalQuickTemplate, [
		{ arrivalDate: '08/10/2026', quantity: '500', container: '', supplier: '' },
	]);
	const parsed = parseCsv(csv);
	const mapping = suggestMapping(parsed.headers, arrivalQuickSchema);
	const result = validateRecords(applyMapping(parsed, mapping), arrivalQuickSchema);
	assert.equal(result.errorCount, 1);
	assert.ok(result.issues.some((issue) => issue.message.includes('ISO date')));
});

test('arrival RESULT CSV cannot be mistaken for an input CSV', () => {
	const analysis = analyzeArrivals({
		arrivals: [{ monthKey: '2026-08', quantity: 100, container: undefined, supplier: undefined }],
		monthlyCapacity: undefined,
	});
	const parsed = parseCsv(arrivalResultToCsv(analysis));
	const mapping = suggestMapping(parsed.headers, arrivalQuickSchema);
	assert.ok(validateMapping(mapping, arrivalQuickSchema).some((issue) => issue.severity === 'error'));
});
