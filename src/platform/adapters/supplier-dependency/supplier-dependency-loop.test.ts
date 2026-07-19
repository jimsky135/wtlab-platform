// Sixth instrument's Reusable Data Loop, end to end in Node: manual values
// → input CSV → parse → map → validate → confirm → adapter → engine →
// result — and the exported result CSV must NOT be mappable as an input
// CSV. Same guarantees as every prior instrument (Sprint 009: the CSV
// pipeline needed zero changes for the sixth instrument either).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeSupplierDependency } from '../../../tools/supplier-dependency-radar/analyze.ts';
import { supplierDependencyAdvancedResultToCsv, supplierDependencyQuickResultToCsv } from '../../../tools/supplier-dependency-radar/export.ts';
import { supplierDependencyAdvancedSchema } from '../../../tools/supplier-dependency-radar/modes/advanced/schema.ts';
import { supplierDependencyAdvancedTemplate } from '../../../tools/supplier-dependency-radar/modes/advanced/template.ts';
import { supplierDependencyQuickSchema } from '../../../tools/supplier-dependency-radar/modes/quick/schema.ts';
import { supplierDependencyQuickTemplate } from '../../../tools/supplier-dependency-radar/modes/quick/template.ts';
import { computeSupplierDependencyPortfolio } from '../../../tools/supplier-dependency-radar/portfolio.ts';
import { validateSupplierDependencyQuickInput } from '../../../tools/supplier-dependency-radar/validate.ts';
import { confirmIntake } from '../../intake/confirm.ts';
import { parseCsv } from '../../intake/csv.ts';
import { applyMapping, suggestMapping, validateMapping } from '../../intake/mapping.ts';
import type { IntakeSchema } from '../../intake/types.ts';
import { validateRecords } from '../../intake/validate.ts';
import { generateBlankTemplateCsv, generateInputCsv } from '../../templates/generate-csv-template.ts';
import { supplierDependencyAdvancedAdapter } from './advanced-adapter.ts';
import { supplierDependencyQuickAdapter } from './quick-adapter.ts';

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

test('QUICK LOOP: exported input CSV re-imports and reproduces the same dependency assessment', () => {
	const values = {
		supplierName: 'acme',
		materialCount: '5',
		criticalMaterialCount: '2',
		supplierSharePercent: '90',
		singleSourceMaterialCount: '2',
		qualifiedSingleSourceMaterialCount: '1',
		qualifiedAlternativeAvailable: 'false',
		qualificationLeadTimeMonths: '9',
	};
	const inputCsv = generateInputCsv(supplierDependencyQuickTemplate, [values]);
	const confirmed = runIntake(inputCsv, supplierDependencyQuickSchema);
	const adapted = supplierDependencyQuickAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const validated = validateSupplierDependencyQuickInput(adapted.data[0].input);
		assert.equal(validated.valid, true);
		if (validated.valid) {
			const output = analyzeSupplierDependency(validated.data);
			assert.equal(output.overallRisk, 'critical');
			const resultCsv = supplierDependencyQuickResultToCsv(validated.data, output);
			assert.ok(resultCsv.startsWith('supplier,material,overallRisk'));
		}
	}
});

test('ADVANCED LOOP: exported input CSV re-imports and reproduces the portfolio result', () => {
	const rows = [
		{ supplierName: 'acme', materialName: 'resin', supplierSharePercent: '95', criticalMaterial: 'true', singleSource: 'true', qualifiedAlternativeAvailable: 'false', qualificationLeadTimeMonths: '' },
		{ supplierName: 'globex', materialName: 'packaging', supplierSharePercent: '30', criticalMaterial: 'false', singleSource: 'false' },
	];
	const inputCsv = generateInputCsv(supplierDependencyAdvancedTemplate, rows);
	const confirmed = runIntake(inputCsv, supplierDependencyAdvancedSchema);
	const adapted = supplierDependencyAdvancedAdapter(confirmed);
	assert.equal(adapted.ok, true);
	if (adapted.ok) {
		const result = computeSupplierDependencyPortfolio(adapted.data);
		assert.equal(result.supplierRanking[0], 'acme');
		const resultCsv = supplierDependencyAdvancedResultToCsv(result);
		assert.ok(resultCsv.includes('acme,resin'));
	}
});

test('blank templates run the full loop directly', () => {
	const quickConfirmed = runIntake(generateBlankTemplateCsv(supplierDependencyQuickTemplate), supplierDependencyQuickSchema);
	assert.equal(supplierDependencyQuickAdapter(quickConfirmed).ok, true);

	const advancedConfirmed = runIntake(generateBlankTemplateCsv(supplierDependencyAdvancedTemplate), supplierDependencyAdvancedSchema);
	assert.equal(supplierDependencyAdvancedAdapter(advancedConfirmed).ok, true);
});

test('RESULT CSVs cannot be mistaken for input CSVs — mapping fails required fields', () => {
	const quickResult = supplierDependencyQuickResultToCsv(
		{
			supplierName: 'acme',
			materialCount: 1,
			criticalMaterialCount: 0,
			supplierSharePercent: 10,
			singleSourceMaterialCount: 0,
			qualifiedSingleSourceMaterialCount: 0,
			alternativeSupplierAvailable: undefined,
			qualifiedAlternativeAvailable: undefined,
			qualificationRequired: undefined,
			qualificationLeadTimeMonths: undefined,
			customerApprovalRequired: undefined,
			trialProductionRequired: undefined,
			averageLeadTimeDays: undefined,
			averageDelayDays: undefined,
			deliveryReliabilityPercent: undefined,
			agreementCancellationCount: undefined,
			annualExposureValue: undefined,
			estimatedSwitchingTimeOverride: undefined,
		},
		analyzeSupplierDependency({
			supplierName: 'acme',
			materialCount: 1,
			criticalMaterialCount: 0,
			supplierSharePercent: 10,
			singleSourceMaterialCount: 0,
			qualifiedSingleSourceMaterialCount: 0,
			alternativeSupplierAvailable: undefined,
			qualifiedAlternativeAvailable: undefined,
			qualificationRequired: undefined,
			qualificationLeadTimeMonths: undefined,
			customerApprovalRequired: undefined,
			trialProductionRequired: undefined,
			averageLeadTimeDays: undefined,
			averageDelayDays: undefined,
			deliveryReliabilityPercent: undefined,
			agreementCancellationCount: undefined,
			annualExposureValue: undefined,
			estimatedSwitchingTimeOverride: undefined,
		})
	);
	const parsedQuick = parseCsv(quickResult);
	const quickMapping = suggestMapping(parsedQuick.headers, supplierDependencyQuickSchema);
	assert.ok(validateMapping(quickMapping, supplierDependencyQuickSchema).some((issue) => issue.severity === 'error'));

	const advancedResult = supplierDependencyAdvancedResultToCsv(
		computeSupplierDependencyPortfolio({
			relationships: [
				{
					supplierName: 'acme',
					materialName: 'resin',
					materialCategory: undefined,
					supplierSharePercent: undefined,
					criticalMaterial: undefined,
					singleSource: undefined,
					alternativeSupplierAvailable: undefined,
					qualifiedAlternativeAvailable: undefined,
					qualificationRequired: undefined,
					qualificationLeadTimeMonths: undefined,
					customerApprovalRequired: undefined,
					trialProductionRequired: undefined,
					leadTimeDays: undefined,
					averageDelayDays: undefined,
					deliveryReliabilityPercent: undefined,
					agreementCancellationCount: undefined,
					annualUsage: undefined,
					annualExposureValue: undefined,
					optionalNotes: undefined,
				},
			],
		})
	);
	const parsedAdvanced = parseCsv(advancedResult);
	const advancedMapping = suggestMapping(parsedAdvanced.headers, supplierDependencyAdvancedSchema);
	assert.ok(validateMapping(advancedMapping, supplierDependencyAdvancedSchema).some((issue) => issue.severity === 'error'));
});
