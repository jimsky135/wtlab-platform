// Locale list and route-equivalence helpers. English is the default,
// unprefixed locale; Traditional Chinese is prefixed with /zh-tw/.
// These helpers are the single source of truth for the URL policy so
// the language switcher and page wrappers never hand-roll path math.

import type { Locale } from './types.ts';

export const DEFAULT_LOCALE: Locale = 'en';
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'zh-TW'];

/** URL path segment for a locale ('' for the default/unprefixed locale). */
export function localePrefix(locale: Locale): string {
	return locale === DEFAULT_LOCALE ? '' : '/zh-tw';
}

/**
 * Turns a locale-neutral path ('/about') into a locale-specific one.
 * The zh-TW *root* is deliberately returned with a trailing slash
 * ('/zh-tw/', not '/zh-tw') — some static hosts don't reliably redirect
 * a bare locale-prefix directory URL with no further segments to its
 * index file, unlike nested paths ('/zh-tw/instruments'), which are
 * unaffected and keep the existing no-trailing-slash convention.
 */
export function localizePath(locale: Locale, path: string): string {
	const normalized = path === '/' ? '' : path;
	const prefix = localePrefix(locale);
	if (prefix !== '' && normalized === '') return `${prefix}/`;
	return `${prefix}${normalized}` || '/';
}

/**
 * Strips a known locale prefix from a path, returning the locale and the
 * locale-neutral remainder. Used by the language switcher to compute the
 * equivalent route in the other locale.
 */
export function resolveLocaleFromPath(path: string): { locale: Locale; path: string } {
	if (path.startsWith('/zh-tw')) {
		const rest = path.slice('/zh-tw'.length);
		return { locale: 'zh-TW', path: rest === '' ? '/' : rest };
	}
	return { locale: 'en', path };
}

/** Equivalent path in `targetLocale` for a path that may carry either locale's prefix. */
export function equivalentPath(currentPath: string, targetLocale: Locale): string {
	const { path } = resolveLocaleFromPath(currentPath);
	return localizePath(targetLocale, path);
}

export function isSupportedLocale(value: string): value is Locale {
	return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
