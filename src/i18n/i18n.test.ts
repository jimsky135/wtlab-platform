import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDictionary } from './index.ts';
import { resolveMessage } from './resolveMessage.ts';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, equivalentPath, isSupportedLocale, localizePath, resolveLocaleFromPath } from './locales.ts';
import { MESSAGE_CODES } from '../platform/message-codes.ts';

test('English is the default, unprefixed locale', () => {
	assert.equal(DEFAULT_LOCALE, 'en');
	assert.equal(localizePath('en', '/instruments'), '/instruments');
});

test('Traditional Chinese is prefixed with /zh-tw', () => {
	assert.equal(localizePath('zh-TW', '/instruments'), '/zh-tw/instruments');
});

test('locale homepage resolves to a valid root path for each locale', () => {
	assert.equal(localizePath('en', '/'), '/');
	// zh-TW root deliberately keeps a trailing slash — see localizePath's
	// doc comment (bare '/zh-tw' isn't reliably redirected by every static host).
	assert.equal(localizePath('zh-TW', '/'), '/zh-tw/');
});

test('nested zh-TW paths do not carry a trailing slash (existing convention)', () => {
	assert.equal(localizePath('zh-TW', '/instruments'), '/zh-tw/instruments');
	assert.equal(localizePath('zh-TW', '/tools/inventory-buffer-check'), '/zh-tw/tools/inventory-buffer-check');
});

test('resolveLocaleFromPath strips a known prefix and reports the locale', () => {
	assert.deepEqual(resolveLocaleFromPath('/zh-tw/instruments/dead-stock-scanner'), {
		locale: 'zh-TW',
		path: '/instruments/dead-stock-scanner',
	});
	assert.deepEqual(resolveLocaleFromPath('/instruments/dead-stock-scanner'), {
		locale: 'en',
		path: '/instruments/dead-stock-scanner',
	});
	assert.deepEqual(resolveLocaleFromPath('/zh-tw'), { locale: 'zh-TW', path: '/' });
});

test('equivalentPath preserves the route when switching languages either direction', () => {
	assert.equal(equivalentPath('/instruments/dead-stock-scanner', 'zh-TW'), '/zh-tw/instruments/dead-stock-scanner');
	assert.equal(equivalentPath('/zh-tw/instruments/dead-stock-scanner', 'en'), '/instruments/dead-stock-scanner');
	assert.equal(equivalentPath('/zh-tw/tools/inventory-buffer-check', 'en'), '/tools/inventory-buffer-check');
});

test('switching to the same locale is a no-op', () => {
	assert.equal(equivalentPath('/about', 'en'), '/about');
	assert.equal(equivalentPath('/zh-tw/about', 'zh-TW'), '/zh-tw/about');
});

test('isSupportedLocale rejects unknown locale strings', () => {
	assert.equal(isSupportedLocale('en'), true);
	assert.equal(isSupportedLocale('zh-TW'), true);
	assert.equal(isSupportedLocale('fr'), false);
	assert.equal(isSupportedLocale('zh-CN'), false);
});

test('exactly two locales are supported, en and zh-TW', () => {
	assert.deepEqual([...SUPPORTED_LOCALES].sort(), ['en', 'zh-TW'].sort());
});

// ---- translation completeness ----

function keySet(value: unknown, prefix = ''): Set<string> {
	const keys = new Set<string>();
	if (value === null || typeof value !== 'object') {
		keys.add(prefix);
		return keys;
	}
	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			for (const key of keySet(item, `${prefix}[${index}]`)) keys.add(key);
		});
		return keys;
	}
	for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
		const path = prefix ? `${prefix}.${childKey}` : childKey;
		for (const key of keySet(childValue, path)) keys.add(key);
	}
	return keys;
}

test('en and zh-TW dictionaries expose exactly the same key paths (no missing translations)', () => {
	const enKeys = keySet(getDictionary('en'));
	const zhKeys = keySet(getDictionary('zh-TW'));

	const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key));
	const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key));

	assert.deepEqual(missingInZh, [], `zh-TW is missing keys: ${missingInZh.join(', ')}`);
	assert.deepEqual(missingInEn, [], `en is missing keys: ${missingInEn.join(', ')}`);
});

test('every dictionary string value is non-empty', () => {
	for (const locale of SUPPORTED_LOCALES) {
		const dict = getDictionary(locale);
		const empties: string[] = [];
		function walk(value: unknown, path: string) {
			if (typeof value === 'string') {
				if (value.trim() === '') empties.push(path);
				return;
			}
			if (value === null || typeof value !== 'object') return;
			if (Array.isArray(value)) {
				value.forEach((item, index) => walk(item, `${path}[${index}]`));
				return;
			}
			for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
				walk(child, path ? `${path}.${key}` : key);
			}
		}
		walk(dict, '');
		assert.deepEqual(empties, [], `${locale} has empty string values at: ${empties.join(', ')}`);
	}
});

test('dictionaries report their own locale and a distinct html lang', () => {
	assert.equal(getDictionary('en').locale, 'en');
	assert.equal(getDictionary('en').htmlLang, 'en');
	assert.equal(getDictionary('zh-TW').locale, 'zh-TW');
	assert.equal(getDictionary('zh-TW').htmlLang, 'zh-Hant-TW');
});

test('per-instrument result dictionaries exist for all six production instruments in both locales', () => {
	for (const locale of SUPPORTED_LOCALES) {
		const results = getDictionary(locale).results;
		assert.ok(results.inventoryBufferCheck);
		assert.ok(results.arrivalCollisionDetector);
		assert.ok(results.deadStockScanner);
		assert.ok(results.leadTimeGapChecker);
		assert.ok(results.bufferDriftMonitor);
		assert.ok(results.supplierDependencyRadar);
	}
});

test('supplier dependency radar: reason codes and recommended action codes are identical across locales (never translated)', () => {
	// reasonCodes/recommendedActionCodes are raw domain vocabulary (types.ts),
	// not part of the Dictionary — this asserts the engine itself, not i18n,
	// which is the point: there is no locale-specific variant to compare.
	const en = getDictionary('en').results.supplierDependencyRadar;
	const zh = getDictionary('zh-TW').results.supplierDependencyRadar;
	assert.deepEqual(Object.keys(en.overallRisk).sort(), Object.keys(zh.overallRisk).sort());
	assert.deepEqual(Object.keys(en.supplyDependencyCondition).sort(), Object.keys(zh.supplyDependencyCondition).sort());
	assert.deepEqual(Object.keys(en.switchingReadiness).sort(), Object.keys(zh.switchingReadiness).sort());
});

// ---- structured messages (Sprint 006, Task 015/016) ----
// The `Dictionary.messages: Record<MessageCode, string>` type already gives
// EN/zh-TW key-parity and completeness at compile time — a missing code is
// a type error, and `satisfies Dictionary` catches it before these tests
// even run. These tests are the runtime belt-and-suspenders the sprint
// brief asks for, plus behavior resolveMessage() itself is responsible for.

test('every message code resolves to non-empty text in both locales', () => {
	for (const locale of SUPPORTED_LOCALES) {
		for (const code of MESSAGE_CODES) {
			const text = resolveMessage(locale, code, { field: 'x', value: 'x', min: 1, max: 1, index: 1, name: 'x', count: 1 });
			assert.ok(text.trim().length > 0, `${locale}/${code} resolved to empty text`);
		}
	}
});

test('resolveMessage interpolates every {param} placeholder — no literal braces leak through', () => {
	for (const locale of SUPPORTED_LOCALES) {
		for (const code of MESSAGE_CODES) {
			const text = resolveMessage(locale, code, {
				field: 'FIELD',
				value: 'VALUE',
				min: 1,
				max: 2,
				index: 3,
				name: 'NAME',
				count: 4,
				row: 4,
				month: 'MONTH',
				total: 5,
				capacity: 6,
				percent: 7,
				batches: 8,
				containers: 9,
				period: 10,
				high: 11,
				excess: 12,
				dormant: 13,
				dead: 14,
				got: 15,
				expected: 16,
				sources: 'SOURCES',
				values: 'VALUES',
			});
			assert.ok(!/\{[a-zA-Z]+\}/.test(text), `${locale}/${code} left an unresolved placeholder: "${text}"`);
		}
	}
});

test('resolveMessage is deterministic — same code/locale/params always resolves the same text', () => {
	const a = resolveMessage('en', 'REQUIRED_FIELD', { field: 'Item Name' });
	const b = resolveMessage('en', 'REQUIRED_FIELD', { field: 'Item Name' });
	assert.equal(a, b);
});

test('EN resolves to English, zh-TW resolves to Traditional Chinese, for the same code and params', () => {
	const en = resolveMessage('en', 'REQUIRED_FIELD', { field: 'Item Name' });
	const zh = resolveMessage('zh-TW', 'REQUIRED_FIELD', { field: 'Item Name' });
	assert.match(en, /required/i);
	assert.match(zh, /必填/);
	assert.notEqual(en, zh);
});
