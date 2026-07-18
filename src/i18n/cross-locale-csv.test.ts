// Sprint 005.5, Task 007: proves CSV files are locale-neutral. Each
// instrument's IntakeSchema/CsvTemplateDefinition is imported exactly
// once and reused, unparameterized, by both the English and zh-TW route
// wrappers (see src/views/instruments/*.astro) — there is no per-locale
// schema or template. Headers are schema field ids, never presentation
// labels, so a CSV produced on one locale's site re-uploads cleanly on
// the other.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmIntake } from '../platform/intake/confirm.ts';
import { parseCsv } from '../platform/intake/csv.ts';
import { applyMapping, suggestMapping, validateMapping } from '../platform/intake/mapping.ts';
import type { IntakeSchema } from '../platform/intake/types.ts';
import { validateRecords } from '../platform/intake/validate.ts';
import { generateBlankTemplateCsv } from '../platform/templates/generate-csv-template.ts';
import type { CsvTemplateDefinition } from '../platform/templates/types.ts';
import { advancedIntakeSchema as waterAdvancedSchema } from '../tools/inventory-buffer-check/modes/advanced/schema.ts';
import { advancedCsvTemplate as waterAdvancedTemplate } from '../tools/inventory-buffer-check/modes/advanced/template.ts';
import { quickIntakeSchema as waterQuickSchema } from '../tools/inventory-buffer-check/modes/quick/schema.ts';
import { quickCsvTemplate as waterQuickTemplate } from '../tools/inventory-buffer-check/modes/quick/template.ts';
import { arrivalAdvancedSchema } from '../tools/arrival-collision-detector/modes/advanced/schema.ts';
import { arrivalAdvancedTemplate } from '../tools/arrival-collision-detector/modes/advanced/template.ts';
import { arrivalQuickSchema } from '../tools/arrival-collision-detector/modes/quick/schema.ts';
import { arrivalQuickTemplate } from '../tools/arrival-collision-detector/modes/quick/template.ts';
import { deadStockAdvancedSchema } from '../tools/dead-stock-scanner/modes/advanced/schema.ts';
import { deadStockAdvancedTemplate } from '../tools/dead-stock-scanner/modes/advanced/template.ts';
import { deadStockQuickSchema } from '../tools/dead-stock-scanner/modes/quick/schema.ts';
import { deadStockQuickTemplate } from '../tools/dead-stock-scanner/modes/quick/template.ts';

const INSTRUMENTS: Array<{
	name: string;
	schema: IntakeSchema;
	template: CsvTemplateDefinition;
	expectedFieldIds: string[];
}> = [
	{
		name: 'Water Level Checker — quick',
		schema: waterQuickSchema,
		template: waterQuickTemplate,
		expectedFieldIds: [
			'itemName',
			'currentStock',
			'monthlyConsumption',
			'leadTimeMonths',
			'safetyBufferMonths',
			'inTransitQuantity',
			'arrivalTimeMonths',
		],
	},
	{
		name: 'Water Level Checker — advanced',
		schema: waterAdvancedSchema,
		template: waterAdvancedTemplate,
		expectedFieldIds: ['itemName', 'period', 'beginningInventory', 'safetyBufferMonths', 'consumption', 'arrivalQuantity'],
	},
	{
		name: 'Arrival Collision Detector — quick',
		schema: arrivalQuickSchema,
		template: arrivalQuickTemplate,
		expectedFieldIds: ['arrivalDate', 'quantity', 'container', 'supplier'],
	},
	{
		name: 'Arrival Collision Detector — advanced',
		schema: arrivalAdvancedSchema,
		template: arrivalAdvancedTemplate,
		expectedFieldIds: ['arrivalDate', 'quantity', 'container', 'supplier', 'monthlyCapacity'],
	},
	{
		name: 'Dead Stock Scanner — quick',
		schema: deadStockQuickSchema,
		template: deadStockQuickTemplate,
		expectedFieldIds: ['item', 'currentStock', 'recentMonthlyConsumption', 'monthsSinceLastMovement', 'futureDemand', 'unitCost', 'thresholdMonths'],
	},
	{
		name: 'Dead Stock Scanner — advanced',
		schema: deadStockAdvancedSchema,
		template: deadStockAdvancedTemplate,
		expectedFieldIds: ['item', 'currentStock', 'recentMonthlyConsumption', 'monthsSinceLastMovement', 'futureDemand', 'unitCost', 'category', 'note'],
	},
];

for (const { name, schema, template, expectedFieldIds } of INSTRUMENTS) {
	test(`${name}: field ids are a fixed, locale-neutral machine contract`, () => {
		assert.deepEqual(
			schema.fields.map((field) => field.id),
			expectedFieldIds
		);
	});

	test(`${name}: CSV headers are field ids, never presentation labels`, () => {
		const headerRow = generateBlankTemplateCsv(template).split('\n')[0];
		assert.equal(headerRow, expectedFieldIds.join(','));
	});

	test(`${name}: one schema/template pair serves both locales — a generated CSV re-imports cleanly`, () => {
		const csv = generateBlankTemplateCsv(template);
		const parsed = parseCsv(csv);
		assert.equal(parsed.ok, true, 'blank template must parse');
		const mapping = suggestMapping(parsed.headers, schema);
		assert.equal(validateMapping(mapping, schema).length, 0, 'field-id headers must map exactly with no manual intervention');
		const result = validateRecords(applyMapping(parsed, mapping), schema);
		assert.equal(result.errorCount, 0, 'blank template values must validate');
		const outcome = confirmIntake(schema, result);
		assert.equal(outcome.confirmed, true);
	});
}
