export * from './types.ts';
export {
	DEFAULT_LOCALE,
	SUPPORTED_LOCALES,
	equivalentPath,
	isSupportedLocale,
	localePrefix,
	localizePath,
	resolveLocaleFromPath,
} from './locales.ts';

import type { Dictionary, Locale } from './types.ts';
import { en } from './en.ts';
import { zhTW } from './zh-TW.ts';

const DICTIONARIES: Record<Locale, Dictionary> = { en, 'zh-TW': zhTW };

export function getDictionary(locale: Locale): Dictionary {
	return DICTIONARIES[locale];
}
