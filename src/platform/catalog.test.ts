import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	ALL_CATALOG_STATUSES,
	ALL_IMPLEMENTATION_STATES,
	ALL_LAYERS,
	findById,
	findBySlug,
} from './catalog.ts';
import { instruments } from './instruments.ts';
import { platformRegistry } from './registry.ts';
import { workspaces } from './workspaces.ts';

const allEntries = [...instruments, ...workspaces];

function assertUnique(values: string[], label: string) {
	const seen = new Set(values);
	assert.equal(seen.size, values.length, `duplicate ${label} found: ${values.join(', ')}`);
}

test('catalog ids are unique across instruments and workspaces', () => {
	assertUnique(
		allEntries.map((entry) => entry.id),
		'id'
	);
});

test('catalog slugs are unique across instruments and workspaces', () => {
	assertUnique(
		allEntries.map((entry) => entry.slug),
		'slug'
	);
});

test('catalog routes are unique across instruments and workspaces', () => {
	assertUnique(
		allEntries.map((entry) => entry.route),
		'route'
	);
});

test('every entry has a route that starts with /', () => {
	for (const entry of allEntries) {
		assert.match(entry.route, /^\//, `${entry.id} route must start with /`);
	}
});

test('every entry uses an allowed layer', () => {
	for (const entry of allEntries) {
		assert.ok(ALL_LAYERS.includes(entry.layer), `${entry.id} has invalid layer ${entry.layer}`);
	}
});

test('every entry uses an allowed catalog status', () => {
	for (const entry of allEntries) {
		assert.ok(ALL_CATALOG_STATUSES.includes(entry.status), `${entry.id} has invalid status ${entry.status}`);
	}
});

test('every entry uses an allowed implementation state', () => {
	for (const entry of allEntries) {
		assert.ok(
			ALL_IMPLEMENTATION_STATES.includes(entry.implementationState),
			`${entry.id} has invalid implementationState ${entry.implementationState}`
		);
	}
});

test('exactly seven instruments are registered', () => {
	assert.equal(instruments.length, 7);
});

test('placeholder instruments are not enabled', () => {
	for (const instrument of instruments) {
		if (instrument.implementationState === 'placeholder') {
			assert.equal(instrument.enabled, false, `${instrument.id} is a placeholder but enabled`);
		}
	}
});

test('the first tool is registered in the catalog and backed by the executable registry', () => {
	const entry = findById(instruments, 'inventory-buffer-check');
	assert.ok(entry, 'inventory-buffer-check missing from instrument catalog');
	assert.equal(entry.displayName, 'Water Level Checker');
	assert.equal(entry.enabled, true);
	assert.equal(entry.implementationState, 'implemented');
	assert.equal(entry.route, '/tools/inventory-buffer-check');

	// Catalog enabled state must agree with executable availability.
	assert.ok(entry.toolId, 'implemented instrument must reference an executable tool id');
	assert.equal(platformRegistry.isAvailable(entry.toolId), true);
});

test('instrument entries with a toolId reference a tool that exists in the registry', () => {
	for (const instrument of instruments) {
		if (instrument.toolId !== undefined) {
			assert.ok(
				platformRegistry.getById(instrument.toolId),
				`${instrument.id} references unknown toolId ${instrument.toolId}`
			);
		}
	}
});

test('catalog lookup works by id and by slug', () => {
	assert.equal(findById(instruments, 'inventory-buffer-check')?.slug, 'water-level-checker');
	assert.equal(findBySlug(instruments, 'water-level-checker')?.id, 'inventory-buffer-check');
	assert.equal(findBySlug(workspaces, 'command-center')?.route, '/command');
	assert.equal(findById(instruments, 'does-not-exist'), undefined);
	assert.equal(findBySlug(workspaces, 'does-not-exist'), undefined);
});
