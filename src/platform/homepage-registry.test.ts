// Task 006 Case 3 — the homepage must source its tool list from
// platformRegistry.getAvailable(), not a hardcoded list.
//
// Astro page templates aren't something a plain Node unit test can render
// (no framework runtime, and Task 006 explicitly forbids adding one just
// for this). Instead this does a minimal, maintainable static check: read
// the homepage source and confirm it calls the Registry's availability
// API and never hardcodes the tool's display name as literal markup.
//
// Sprint 005.5 update: src/pages/index.astro is now a thin locale
// wrapper (`<HomeView locale="en" />`) — the actual registry call lives
// in the shared src/views/HomeView.astro that both locale routes render,
// so this test now points there instead.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const indexAstroPath = fileURLToPath(new URL('../views/HomeView.astro', import.meta.url));
const source = readFileSync(indexAstroPath, 'utf-8');

test('Task 006 Case 3 — homepage reads tools from platformRegistry.getAvailable()', () => {
	assert.match(source, /import\s*\{\s*platformRegistry\s*\}\s*from\s*['"].*platform\/registry['"]/);
	assert.match(source, /platformRegistry\.getAvailable\(\)/);
});

test('Task 006 Case 3 — homepage does not hardcode the tool name as static markup', () => {
	assert.doesNotMatch(source, /Water Level Checker/);
	assert.doesNotMatch(source, /inventory-buffer-check['"`]/);
});
