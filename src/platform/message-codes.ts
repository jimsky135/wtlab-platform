// Stable, locale-independent message vocabulary (Sprint 006, Task 013/014).
// Business logic (Shared Intake, adapters, tool validators, engines) emits
// only these codes plus structured params — never translated prose. The
// i18n layer (src/i18n/messages.ts) owns the EN/zh-TW template for each
// code; src/i18n/resolveMessage.ts does the interpolation. This module has
// no i18n dependency, matching the intended dependency direction: the
// vocabulary of "what happened" is platform-owned, translations are not.

export const MESSAGE_CODES = [
	// --- Shared Intake: normalization (src/platform/intake/normalize.ts) ---
	'WHITESPACE_TRIMMED',
	'BLANK_TREATED_AS_MISSING',
	'INVALID_NUMBER',

	// --- Shared Intake: validation (src/platform/intake/validate.ts) ---
	'REQUIRED_FIELD',
	'NUMBER_TOO_LOW',
	'NUMBER_TOO_HIGH',
	'NOT_ALLOWED_VALUE',

	// --- Shared Intake: CSV parsing (src/platform/intake/csv.ts) ---
	'CSV_FILE_EMPTY',
	'CSV_NO_ROWS',
	'CSV_NO_HEADERS',
	'CSV_BLANK_HEADER',
	'CSV_DUPLICATE_HEADER',
	'CSV_NO_DATA_ROWS',
	'CSV_ROW_LENGTH_MISMATCH',

	// --- Shared Intake: mapping (src/platform/intake/mapping.ts) ---
	'MAPPING_DUPLICATE_DESTINATION',
	'MAPPING_REQUIRED_FIELD_UNMAPPED',

	// --- Shared Intake: confirmation (src/platform/intake/confirm.ts) ---
	'CONFIRM_NO_DATA',
	'CONFIRM_BLOCKED_BY_ERRORS',

	// --- Data Intake workspace demo (src/views/_data-intake-demo-schema.ts) ---
	'DEMO_QUANTITY_ZERO_WARNING',

	// --- Adapters: structural guards (src/platform/adapters/**) ---
	'NO_CONFIRMED_ROWS',
	'ROW_MISSING_ITEM_OR_PERIOD',
	'DUPLICATE_PERIOD_FOR_ITEM',
	'ITEM_MISSING_BEGINNING_INVENTORY',
	'ITEM_MISSING_INTENDED_BUFFER',

	// --- Mode schema validateRecord (instrument-specific intake rules) ---
	'ARRIVAL_DATE_INVALID_ISO',
	'DEAD_STOCK_NO_RECENT_CONSUMPTION_WARNING',
	'DEAD_STOCK_FUTURE_DEMAND_UNKNOWN_WARNING',
	'DEAD_STOCK_UNIT_COST_MISSING_WARNING',
	'DEAD_STOCK_DEFAULT_THRESHOLDS_USED',
	'WATER_LEVEL_LEAD_TIME_BLANK',
	'WATER_LEVEL_SAFETY_BUFFER_BLANK',

	// --- Tool Contract validators (src/tools/*/validate.ts) ---
	'VALIDATE_AT_LEAST_ONE_ARRIVAL',
	'VALIDATE_INVALID_MONTH_KEY',
	'VALIDATE_QUANTITY_NON_NEGATIVE',
	'VALIDATE_CAPACITY_NON_NEGATIVE',
	'VALIDATE_AT_LEAST_ONE_ITEM',
	'VALIDATE_MISSING_ITEM_ID',
	'VALIDATE_STOCK_NON_NEGATIVE',
	'VALIDATE_CONSUMPTION_NON_NEGATIVE',
	'VALIDATE_THRESHOLD_POSITIVE',
	'VALIDATE_NUMBER_REQUIRED',
	'VALIDATE_NUMBER_NON_NEGATIVE',
	'VALIDATE_NUMBER_POSITIVE',

	// --- Arrival Collision engine narratives (src/tools/arrival-collision-detector/analyze.ts) ---
	'ARRIVAL_CAPACITY_EXCEEDED',
	'ARRIVAL_CONCENTRATION_SEVERE',
	'ARRIVAL_CONCENTRATION_MODERATE',
	'ARRIVAL_CONTAINER_STACKING',
	'SUGGESTION_SEVERE',
	'SUGGESTION_MODERATE',
	'SUGGESTION_NONE',

	// --- Dead Stock engine narratives (src/tools/dead-stock-scanner/analyze.ts) ---
	'DEAD_STOCK_WARNING_SLOW_MOVING',
	'DEAD_STOCK_WARNING_DORMANT',
	'DEAD_STOCK_WARNING_DEAD_STOCK',
	'DEAD_STOCK_WARNING_EXCESS_EXPOSURE',
	'DEAD_STOCK_ACTION_HEALTHY',
	'DEAD_STOCK_ACTION_SLOW_MOVING',
	'DEAD_STOCK_ACTION_DORMANT',
	'DEAD_STOCK_ACTION_DEAD_STOCK',
	'DEAD_STOCK_ACTION_EXCESS_EXPOSURE',

	// --- Lead Time Gap Checker: mode schema / tool validator (Sprint 007) ---
	'LEAD_TIME_CURRENT_DATE_DEFAULTED',
	'LEAD_TIME_CURRENT_DATE_INVALID_ISO',

	// --- Lead Time Gap Checker engine narratives (src/tools/lead-time-gap-checker/analyze.ts) ---
	'LEAD_TIME_WARNING_THIN_MARGIN',
	'LEAD_TIME_WARNING_GAP_RISK',
	'LEAD_TIME_WARNING_CRITICAL_GAP',
	'LEAD_TIME_ACTION_SAFE',
	'LEAD_TIME_ACTION_WARNING',
	'LEAD_TIME_ACTION_GAP_RISK',
	'LEAD_TIME_ACTION_CRITICAL_GAP',

	// --- Buffer Drift Monitor engine narratives (src/tools/buffer-drift-monitor/analyze.ts) ---
	'BUFFER_DRIFT_WARNING_UNDER',
	'BUFFER_DRIFT_WARNING_SEVERE_UNDER',
	'BUFFER_DRIFT_WARNING_OVER',
	'BUFFER_DRIFT_WARNING_SEVERE_OVER',
	'BUFFER_DRIFT_ACTION_ON_TARGET',
	'BUFFER_DRIFT_ACTION_UNDER',
	'BUFFER_DRIFT_ACTION_SEVERE_UNDER',
	'BUFFER_DRIFT_ACTION_OVER',
	'BUFFER_DRIFT_ACTION_SEVERE_OVER',
] as const;

export type MessageCode = (typeof MESSAGE_CODES)[number];

/** Structured params carry only locale-neutral values: numbers, raw ids, user-entered text. */
export type MessageParams = Record<string, string | number>;

/**
 * A validated structural error, replacing bare `string[]` in the Tool
 * Contract's `ValidationResult`. `message` is the English rendering, kept
 * for backward compatibility (tests, non-localized contexts); presentation
 * should prefer resolving `code` + `params` through the current locale.
 */
export interface ValidationMessage {
	code: MessageCode;
	params?: MessageParams;
	message: string;
}
