// Sprint 010A — Utilities Platform Foundation tests. Mirrors catalog.test.ts's
// checks but against the independent Utility Registry (deliberately not
// importing anything from platform/catalog.ts or the Instrument Factory).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
	ALL_UTILITY_CATEGORIES,
	ALL_UTILITY_IMPLEMENTATION_STATES,
	ALL_UTILITY_STATUSES,
	findUtilityById,
	findUtilityBySlug,
} from './utility-catalog.ts';
import { utilities } from './utilities.ts';

function assertUnique(values: string[], label: string) {
	const seen = new Set(values);
	assert.equal(seen.size, values.length, `duplicate ${label} found: ${values.join(', ')}`);
}

test('utility ids are unique', () => {
	assertUnique(
		utilities.map((utility) => utility.id),
		'id'
	);
});

test('utility slugs are unique', () => {
	assertUnique(
		utilities.map((utility) => utility.slug),
		'slug'
	);
});

test('utility routes are unique', () => {
	assertUnique(
		utilities.map((utility) => utility.route),
		'route'
	);
});

test('every utility has a route that starts with /utilities/', () => {
	for (const utility of utilities) {
		assert.match(utility.route, /^\/utilities\//, `${utility.id} route must start with /utilities/`);
	}
});

test('every utility uses an allowed category', () => {
	for (const utility of utilities) {
		assert.ok(ALL_UTILITY_CATEGORIES.includes(utility.category), `${utility.id} has invalid category ${utility.category}`);
	}
});

test('every utility uses an allowed status', () => {
	for (const utility of utilities) {
		assert.ok(ALL_UTILITY_STATUSES.includes(utility.status), `${utility.id} has invalid status ${utility.status}`);
	}
});

test('every utility uses an allowed implementation state', () => {
	for (const utility of utilities) {
		assert.ok(
			ALL_UTILITY_IMPLEMENTATION_STATES.includes(utility.implementationState),
			`${utility.id} has invalid implementationState ${utility.implementationState}`
		);
	}
});

test('Sprint 010A ships the platform only — every utility stays a placeholder', () => {
	for (const utility of utilities) {
		assert.equal(utility.implementationState, 'placeholder', `${utility.id} must stay unimplemented this sprint`);
		assert.equal(utility.status, 'coming-soon', `${utility.id} must stay coming-soon this sprint`);
	}
});

test('Excel Preprocessor is registered as the first Utility, coming in Sprint 010B', () => {
	const entry = findUtilityById(utilities, 'excel-preprocessor');
	assert.ok(entry, 'excel-preprocessor missing from utility catalog');
	assert.equal(entry.name, 'Excel Preprocessor');
	assert.equal(entry.category, 'data-preparation');
	assert.equal(entry.route, '/utilities/excel-preprocessor');
});

test('Utilities Platform does not depend on the Instrument Factory (architecture principle, Sprint 010A)', () => {
	const here = path.dirname(fileURLToPath(import.meta.url));
	const files = ['utility-catalog.ts', 'utilities.ts'];
	const forbidden = [
		/from ['"]\.\/catalog\.ts['"]/,
		/from ['"]\.\/tool-contract\.ts['"]/,
		/from ['"]\.\/tool-registry\.ts['"]/,
		/from ['"]\.\/registry\.ts['"]/,
		/from ['"]\.\.\/tools\//,
	];
	for (const file of files) {
		const text = readFileSync(path.join(here, file), 'utf8');
		for (const pattern of forbidden) {
			assert.ok(!pattern.test(text), `${file} must not depend on the Instrument Factory (matched ${pattern})`);
		}
	}
});

test('utility lookup works by id and by slug', () => {
	assert.equal(findUtilityById(utilities, 'excel-preprocessor')?.slug, 'excel-preprocessor');
	assert.equal(findUtilityBySlug(utilities, 'excel-preprocessor')?.id, 'excel-preprocessor');
	assert.equal(findUtilityById(utilities, 'does-not-exist'), undefined);
	assert.equal(findUtilityBySlug(utilities, 'does-not-exist'), undefined);
});
