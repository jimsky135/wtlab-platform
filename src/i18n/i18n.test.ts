import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDictionary } from './index.ts';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, equivalentPath, isSupportedLocale, localizePath, resolveLocaleFromPath } from './locales.ts';

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

test('per-instrument result dictionaries exist for all three production instruments in both locales', () => {
	for (const locale of SUPPORTED_LOCALES) {
		const results = getDictionary(locale).results;
		assert.ok(results.inventoryBufferCheck);
		assert.ok(results.arrivalCollisionDetector);
		assert.ok(results.deadStockScanner);
	}
});
