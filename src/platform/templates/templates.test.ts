import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrivalAdvancedSchema } from '../../tools/arrival-collision-detector/modes/advanced/schema.ts';
import { arrivalQuickSchema } from '../../tools/arrival-collision-detector/modes/quick/schema.ts';
import { deadStockAdvancedSchema } from '../../tools/dead-stock-scanner/modes/advanced/schema.ts';
import { deadStockQuickSchema } from '../../tools/dead-stock-scanner/modes/quick/schema.ts';
import { advancedIntakeSchema } from '../../tools/inventory-buffer-check/modes/advanced/schema.ts';
import { quickIntakeSchema } from '../../tools/inventory-buffer-check/modes/quick/schema.ts';
import { leadTimeGapAdvancedSchema } from '../../tools/lead-time-gap-checker/modes/advanced/schema.ts';
import { leadTimeGapQuickSchema } from '../../tools/lead-time-gap-checker/modes/quick/schema.ts';
import { bufferDriftAdvancedSchema } from '../../tools/buffer-drift-monitor/modes/advanced/schema.ts';
import { bufferDriftQuickSchema } from '../../tools/buffer-drift-monitor/modes/quick/schema.ts';
import { supplierDependencyAdvancedSchema } from '../../tools/supplier-dependency-radar/modes/advanced/schema.ts';
import { supplierDependencyQuickSchema } from '../../tools/supplier-dependency-radar/modes/quick/schema.ts';
import { parseCsv } from '../intake/csv.ts';
import { suggestMapping, validateMapping } from '../intake/mapping.ts';
import type { IntakeSchema } from '../intake/types.ts';
import { buildCsv, generateBlankTemplateCsv, generateInputCsv } from './generate-csv-template.ts';
import { csvTemplates, findTemplateById } from './registry.ts';
import type { CsvTemplateDefinition } from './types.ts';

const schemaByTemplate: Record<string, IntakeSchema> = {
	'water-level-quick-input': quickIntakeSchema,
	'water-level-advanced-input': advancedIntakeSchema,
	'arrival-collision-quick-input': arrivalQuickSchema,
	'arrival-collision-advanced-input': arrivalAdvancedSchema,
	'dead-stock-quick-input': deadStockQuickSchema,
	'dead-stock-advanced-input': deadStockAdvancedSchema,
	'lead-time-gap-quick-input': leadTimeGapQuickSchema,
	'lead-time-gap-advanced-input': leadTimeGapAdvancedSchema,
	'buffer-drift-quick-input': bufferDriftQuickSchema,
	'buffer-drift-advanced-input': bufferDriftAdvancedSchema,
	'supplier-dependency-quick-input': supplierDependencyQuickSchema,
	'supplier-dependency-advanced-input': supplierDependencyAdvancedSchema,
};

test('template ids and filenames are unique', () => {
	const ids = csvTemplates.map((template) => template.templateId);
	const files = csvTemplates.map((template) => template.filename);
	assert.equal(new Set(ids).size, ids.length);
	assert.equal(new Set(files).size, files.length);
});

test('every registered template has a schema and matches it column-for-column', () => {
	for (const template of csvTemplates) {
		const schema = schemaByTemplate[template.templateId];
		assert.ok(schema, `no schema mapped for template ${template.templateId}`);
		assert.deepEqual(
			template.columns.map((column) => column.id),
			schema.fields.map((field) => field.id),
			`${template.templateId} columns must equal schema field ids`
		);
		for (const column of template.columns) {
			const field = schema.fields.find((f) => f.id === column.id);
			assert.equal(
				column.required,
				field?.required,
				`${template.templateId}.${column.id} required flag must match schema`
			);
		}
	}
});

test('findTemplateById returns registered templates and undefined otherwise', () => {
	assert.equal(findTemplateById('water-level-quick-input')?.filename, 'water-level-quick-input.csv');
	assert.equal(findTemplateById('nope'), undefined);
});

test('blank templates parse cleanly and map exactly onto their schema', () => {
	for (const template of csvTemplates) {
		const schema = schemaByTemplate[template.templateId];
		const parsed = parseCsv(generateBlankTemplateCsv(template), template.filename);
		assert.equal(parsed.ok, true, `${template.templateId} blank template must parse`);
		const mapping = suggestMapping(parsed.headers, schema);
		assert.ok(
			Object.values(mapping).every((destination) => destination !== null),
			`${template.templateId} headers must all exact-match schema fields`
		);
		assert.equal(validateMapping(mapping, schema).length, 0);
	}
});

test('generateInputCsv writes template headers plus given rows, blanks for undefined', () => {
	const template: CsvTemplateDefinition = {
		templateId: 't',
		instrumentId: 'i',
		modeId: 'm',
		version: '1',
		filename: 't.csv',
		description: '',
		columns: [
			{ id: 'a', required: true, sample: '1' },
			{ id: 'b', required: false, sample: '' },
		],
	};
	const csv = generateInputCsv(template, [{ a: 'x', b: undefined }, { a: 7, b: 'y' }]);
	assert.equal(csv, 'a,b\nx,\n7,y\n');
});

test('buildCsv escapes commas, quotes, and newlines', () => {
	const csv = buildCsv([
		['name', 'note'],
		['Widget, large', 'said "ok"'],
	]);
	const parsed = parseCsv(csv);
	assert.deepEqual(parsed.rows, [['Widget, large', 'said "ok"']]);
});
