// Sprint 006, Task 016: proves the localization boundary actually holds —
// business logic (Shared Intake, adapters, tool validators, engines) never
// imports i18n or branches on locale; it only ever produces stable codes.
// Translation happens exclusively at the presentation boundary (views,
// src/shared/intake-ui.ts, src/i18n/resolveMessage.ts).

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { analyzeArrivals } from '../tools/arrival-collision-detector/analyze.ts';
import { validateArrivalInput } from '../tools/arrival-collision-detector/validate.ts';
import type { ArrivalAnalysisInput } from '../tools/arrival-collision-detector/types.ts';
import { analyzeDeadStock } from '../tools/dead-stock-scanner/analyze.ts';
import { validateDeadStockInput } from '../tools/dead-stock-scanner/validate.ts';
import { DEFAULT_THRESHOLDS, type DeadStockAnalysisInput } from '../tools/dead-stock-scanner/types.ts';
import { parseCsv } from './intake/csv.ts';
import { validateRecords } from './intake/validate.ts';
import type { IntakeSchema } from './intake/types.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(HERE, '..');

const LOCALE_BLIND_DIRS = [
	'platform/intake',
	'platform/adapters',
	'tools/arrival-collision-detector',
	'tools/dead-stock-scanner',
	'tools/inventory-buffer-check',
];

function listTsFiles(dir: string): string[] {
	const entries = readdirSync(dir, { withFileTypes: true });
	return entries.flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return listTsFiles(full);
		if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) return [full];
		return [];
	});
}

test('business logic never imports the i18n layer', () => {
	const offenders: string[] = [];
	for (const rel of LOCALE_BLIND_DIRS) {
		for (const file of listTsFiles(path.join(SRC_ROOT, rel))) {
			const text = readFileSync(file, 'utf8');
			if (/from ['"][^'"]*\/i18n(\/|['"])/.test(text) || /from ['"]\.\.\/i18n/.test(text)) {
				offenders.push(path.relative(SRC_ROOT, file));
			}
		}
	}
	assert.deepEqual(offenders, [], `business logic must not import i18n: ${offenders.join(', ')}`);
});

test('business logic never branches on a locale value', () => {
	const offenders: string[] = [];
	for (const rel of LOCALE_BLIND_DIRS) {
		for (const file of listTsFiles(path.join(SRC_ROOT, rel))) {
			const text = readFileSync(file, 'utf8');
			if (/zh-TW|zh-tw/.test(text) || /\blocale\s*===/.test(text)) {
				offenders.push(path.relative(SRC_ROOT, file));
			}
		}
	}
	assert.deepEqual(offenders, [], `business logic must not branch on locale: ${offenders.join(', ')}`);
});

// ---- same input → same structured (locale-independent) result ----

function arrivalInput(): ArrivalAnalysisInput {
	return {
		arrivals: [
			{ monthKey: '2026-08', quantity: 500, container: undefined, supplier: undefined },
			{ monthKey: '2026-08', quantity: 400, container: undefined, supplier: undefined },
			{ monthKey: '2026-09', quantity: 100, container: undefined, supplier: undefined },
		],
		monthlyCapacity: 600,
	};
}

test('arrival engine: two runs of the same input produce identical warning codes/params (no hidden locale state)', () => {
	const a = analyzeArrivals(arrivalInput());
	const b = analyzeArrivals(arrivalInput());
	assert.deepEqual(
		a.warnings.map((w) => ({ code: w.code, params: w.params })),
		b.warnings.map((w) => ({ code: w.code, params: w.params }))
	);
	assert.equal(a.suggestionCode, b.suggestionCode);
	for (const warning of a.warnings) {
		assert.match(warning.code, /^[A-Z_]+$/, 'codes are a stable SCREAMING_SNAKE_CASE vocabulary, not prose');
	}
});

test('arrival validator: invalid input produces the same error codes on repeated calls', () => {
	const badInput: ArrivalAnalysisInput = {
		arrivals: [{ monthKey: 'not-a-month', quantity: -5, container: undefined, supplier: undefined }],
		monthlyCapacity: -1,
	};
	const first = validateArrivalInput(badInput);
	const second = validateArrivalInput(badInput);
	assert.equal(first.valid, false);
	assert.equal(second.valid, false);
	if (!first.valid && !second.valid) {
		assert.deepEqual(
			first.errors.map((e) => e.code),
			second.errors.map((e) => e.code)
		);
		assert.deepEqual(first.errors.map((e) => e.code).sort(), [
			'VALIDATE_CAPACITY_NON_NEGATIVE',
			'VALIDATE_INVALID_MONTH_KEY',
			'VALIDATE_QUANTITY_NON_NEGATIVE',
		]);
	}
});

function deadStockInput(): DeadStockAnalysisInput {
	return {
		items: [
			{
				item: 'sku-1',
				currentStock: 100,
				recentMonthlyConsumption: 0,
				monthsSinceLastMovement: 20,
				futureDemand: 0,
				unitCost: 2,
				category: undefined,
			},
		],
		thresholds: DEFAULT_THRESHOLDS,
	};
}

test('dead stock engine: classification carries a stable code, not translated prose', () => {
	const analysis = analyzeDeadStock(deadStockInput());
	const item = analysis.items[0];
	assert.equal(item.classification, 'dead-stock');
	assert.equal(item.primaryWarningCode, 'DEAD_STOCK_WARNING_DEAD_STOCK');
	assert.equal(item.recommendedActionCode, 'DEAD_STOCK_ACTION_DEAD_STOCK');
	// reasonCodes (Task 007) are untouched by this sprint — still stable machine codes.
	assert.ok(item.reasonCodes.includes('NO_STOCK') === false);
	assert.ok(item.reasonCodes.length > 0);
});

test('dead stock validator: same invalid input produces the same error codes', () => {
	const badInput: DeadStockAnalysisInput = {
		items: [{ item: '', currentStock: -1, recentMonthlyConsumption: -1, monthsSinceLastMovement: undefined, futureDemand: undefined, unitCost: undefined, category: undefined }],
		thresholds: { ...DEFAULT_THRESHOLDS, highCoverageMonths: -1 },
	};
	const result = validateDeadStockInput(badInput);
	assert.equal(result.valid, false);
	if (!result.valid) {
		assert.deepEqual(result.errors.map((e) => e.code).sort(), [
			'VALIDATE_CONSUMPTION_NON_NEGATIVE',
			'VALIDATE_MISSING_ITEM_ID',
			'VALIDATE_STOCK_NON_NEGATIVE',
			'VALIDATE_THRESHOLD_POSITIVE',
		]);
	}
});

// ---- Shared Intake issues carry stable codes independent of any locale ----

const SCHEMA: IntakeSchema = {
	id: 'locale-independence-fixture',
	title: 'Fixture',
	fields: [{ id: 'quantity', label: 'Quantity', type: 'number', required: true, min: 0 }],
};

test('Shared Intake validation issues carry a stable code and are unaffected by locale (no locale param exists)', () => {
	const result = validateRecords([{ values: {}, unknown: {} }], SCHEMA);
	assert.equal(result.errorCount, 1);
	assert.equal(result.issues[0].code, 'REQUIRED_FIELD');
});

test('CSV parse issues carry a stable code', () => {
	const result = parseCsv('');
	assert.equal(result.issues[0].code, 'CSV_FILE_EMPTY');
});
