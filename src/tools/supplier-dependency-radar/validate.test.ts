import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateSupplierDependencyQuickInput } from './validate.ts';
import type { SupplierDependencyQuickRawInput } from './types.ts';

function rawInput(overrides: Partial<SupplierDependencyQuickRawInput> = {}): SupplierDependencyQuickRawInput {
	return {
		supplierName: 'supplier-a',
		materialCount: '2',
		criticalMaterialCount: '1',
		supplierSharePercent: '60',
		singleSourceMaterialCount: '1',
		qualifiedSingleSourceMaterialCount: '0',
		alternativeSupplierAvailable: '',
		qualifiedAlternativeAvailable: '',
		qualificationRequired: '',
		qualificationLeadTimeMonths: '',
		customerApprovalRequired: '',
		trialProductionRequired: '',
		averageLeadTimeDays: '',
		averageDelayDays: '',
		deliveryReliabilityPercent: '',
		agreementCancellationCount: '',
		annualExposureValue: '',
		estimatedSwitchingTime: '',
		notes: '',
		...overrides,
	};
}

test('valid input parses; blank tri-state/optional fields become undefined (unknown), not false/zero', () => {
	const result = validateSupplierDependencyQuickInput(rawInput());
	assert.equal(result.valid, true);
	if (result.valid) {
		assert.equal(result.data.qualifiedAlternativeAvailable, undefined);
		assert.equal(result.data.qualificationLeadTimeMonths, undefined);
		assert.equal(result.data.customerApprovalRequired, undefined);
	}
});

test('true/false tri-state fields parse to real booleans', () => {
	const result = validateSupplierDependencyQuickInput(
		rawInput({ qualifiedAlternativeAvailable: 'false', customerApprovalRequired: 'true' })
	);
	assert.equal(result.valid, true);
	if (result.valid) {
		assert.equal(result.data.qualifiedAlternativeAvailable, false);
		assert.equal(result.data.customerApprovalRequired, true);
	}
});

test('missing supplier name is a blocking error', () => {
	const result = validateSupplierDependencyQuickInput(rawInput({ supplierName: '  ' }));
	assert.equal(result.valid, false);
	if (!result.valid) assert.ok(result.errors.some((e) => e.code === 'REQUIRED_FIELD'));
});

test('supplier share outside 0-100 is a blocking error', () => {
	const tooHigh = validateSupplierDependencyQuickInput(rawInput({ supplierSharePercent: '150' }));
	assert.equal(tooHigh.valid, false);
	const negative = validateSupplierDependencyQuickInput(rawInput({ supplierSharePercent: '-10' }));
	assert.equal(negative.valid, false);
});

test('negative qualification lead time is a blocking error', () => {
	const result = validateSupplierDependencyQuickInput(rawInput({ qualificationLeadTimeMonths: '-1' }));
	assert.equal(result.valid, false);
});

test('delivery reliability outside 0-100 is a blocking error', () => {
	const result = validateSupplierDependencyQuickInput(rawInput({ deliveryReliabilityPercent: '101' }));
	assert.equal(result.valid, false);
});

test('an invalid tri-state value is a blocking error, distinct from blank', () => {
	const result = validateSupplierDependencyQuickInput(rawInput({ qualifiedAlternativeAvailable: 'maybe' }));
	assert.equal(result.valid, false);
	if (!result.valid) assert.ok(result.errors.some((e) => e.code === 'NOT_ALLOWED_VALUE'));
});

test('same invalid input produces the same error codes on repeated calls', () => {
	const bad = rawInput({ supplierName: '', supplierSharePercent: '-5', qualificationLeadTimeMonths: '-2' });
	const first = validateSupplierDependencyQuickInput(bad);
	const second = validateSupplierDependencyQuickInput(bad);
	assert.equal(first.valid, false);
	assert.equal(second.valid, false);
	if (!first.valid && !second.valid) {
		assert.deepEqual(first.errors.map((e) => e.code).sort(), second.errors.map((e) => e.code).sort());
	}
});
