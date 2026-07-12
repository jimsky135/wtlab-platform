import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createToolRegistry, isPlatformAvailable, type RegisteredTool } from './tool-registry.ts';
import type { ToolMetadata, ToolStatus } from './tool-contract.ts';

// Fixture tool — deliberately generic, no business-specific fields, so
// these tests never depend on any real tool's domain logic.
function fixtureMetadata(id: string, status: ToolStatus, enabled: boolean): ToolMetadata {
	return {
		id,
		name: `Fixture Tool (${id})`,
		description: 'Fixture tool for Tool Registry tests.',
		category: 'test-fixture',
		version: '0.0.1',
		status,
		enabled,
	};
}

function fixtureTool(id: string, status: ToolStatus, enabled: boolean): RegisteredTool {
	return {
		metadata: fixtureMetadata(id, status, enabled),
		initialize: () => ({ ready: true }),
		validate: (input: unknown) => ({ valid: true, data: input }),
		calculate: (input: unknown) => input,
	};
}

// Case 1 — draft + false → unavailable
test('Case 1 — draft + enabled:false is unavailable', () => {
	assert.equal(isPlatformAvailable(fixtureMetadata('t1', 'draft', false)), false);
});

// Case 2 — draft + true → unavailable
test('Case 2 — draft + enabled:true is unavailable', () => {
	assert.equal(isPlatformAvailable(fixtureMetadata('t2', 'draft', true)), false);
});

// Case 3 — active + false → unavailable
test('Case 3 — active + enabled:false is unavailable', () => {
	assert.equal(isPlatformAvailable(fixtureMetadata('t3', 'active', false)), false);
});

// Case 4 — active + true → available
test('Case 4 — active + enabled:true is available', () => {
	assert.equal(isPlatformAvailable(fixtureMetadata('t4', 'active', true)), true);
});

// Case 5 — deprecated + false → unavailable
test('Case 5 — deprecated + enabled:false is unavailable', () => {
	assert.equal(isPlatformAvailable(fixtureMetadata('t5', 'deprecated', false)), false);
});

// Case 6 — deprecated + true → unavailable
test('Case 6 — deprecated + enabled:true is unavailable', () => {
	assert.equal(isPlatformAvailable(fixtureMetadata('t6', 'deprecated', true)), false);
});

test('registry mechanics: getAll returns every registered fixture regardless of gating', () => {
	const registry = createToolRegistry([
		fixtureTool('draft-tool', 'draft', false),
		fixtureTool('active-tool', 'active', true),
		fixtureTool('deprecated-tool', 'deprecated', true),
	]);

	const ids = registry.getAll().map((tool) => tool.metadata.id);
	assert.deepEqual(new Set(ids), new Set(['draft-tool', 'active-tool', 'deprecated-tool']));
});

test('registry mechanics: getAvailable only returns active+enabled fixtures', () => {
	const registry = createToolRegistry([
		fixtureTool('draft-tool', 'draft', true),
		fixtureTool('active-tool', 'active', true),
		fixtureTool('deprecated-tool', 'deprecated', true),
	]);

	const availableIds = registry.getAvailable().map((tool) => tool.metadata.id);
	assert.deepEqual(availableIds, ['active-tool']);
});

test('registry mechanics: isAvailable matches getAvailable for each fixture', () => {
	const registry = createToolRegistry([
		fixtureTool('draft-tool', 'draft', true),
		fixtureTool('active-tool', 'active', true),
	]);

	assert.equal(registry.isAvailable('draft-tool'), false);
	assert.equal(registry.isAvailable('active-tool'), true);
});

test('registry mechanics: lookup by unregistered id returns undefined, isAvailable is false', () => {
	const registry = createToolRegistry([fixtureTool('active-tool', 'active', true)]);

	assert.equal(registry.getById('does-not-exist'), undefined);
	assert.equal(registry.isAvailable('does-not-exist'), false);
});
