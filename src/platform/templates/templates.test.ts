import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advancedIntakeSchema } from '../../tools/inventory-buffer-check/modes/advanced/schema.ts';
import { quickIntakeSchema } from '../../tools/inventory-buffer-check/modes/quick/schema.ts';
import { parseCsv } from '../intake/csv.ts';
import { suggestMapping, validateMapping } from '../intake/mapping.ts';
import type { IntakeSchema } from '../intake/types.ts';
import { buildCsv, generateBlankTemplateCsv, generateInputCsv } from './generate-csv-template.ts';
import { csvTemplates, findTemplateById } from './registry.ts';
import type { CsvTemplateDefinition } from './types.ts';

const schemaByTemplate: Record<string, IntakeSchema> = {
	'water-level-quick-input': quickIntakeSchema,
	'water-level-advanced-input': advancedIntakeSchema,
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
