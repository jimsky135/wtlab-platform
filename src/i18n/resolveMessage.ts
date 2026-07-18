// Message localization resolver (Sprint 006, Task 015). The one place
// business logic's structured (code, params) pairs become display text.
// No per-instrument translation functions — every code, whether it comes
// from Shared Intake, a tool validator, or an engine, resolves here.

import { getDictionary } from './index.ts';
import type { Locale } from './types.ts';
import type { MessageCode, MessageParams } from '../platform/message-codes.ts';

/** Deterministic `{key}` interpolation — no regex, so param values can't be mistaken for patterns. */
function interpolate(template: string, params: MessageParams | undefined): string {
	if (!params) return template;
	let result = template;
	for (const [key, value] of Object.entries(params)) {
		result = result.split(`{${key}}`).join(String(value));
	}
	return result;
}

export function resolveMessage(locale: Locale, code: MessageCode, params?: MessageParams): string {
	const template = getDictionary(locale).messages[code];
	return interpolate(template, params);
}
