// Shared Data Intake — core types. This layer is instrument-agnostic:
// schemas describe fields, the pipeline moves data through explicit
// states, and nothing here knows any instrument's business rules.
//
// Lifecycle: raw input → parse → normalize → validate → preview →
// confirm → instrument-ready data. Raw values are always preserved;
// transformations are recorded as issues, never applied silently.

export type IntakeSeverity = 'error' | 'warning' | 'info';

/**
 * A single reported problem or note. `error` blocks confirmation,
 * `warning` stays visible but allows confirmation, `info` explains a
 * transformation without implying a problem.
 */
export interface IntakeIssue {
	severity: IntakeSeverity;
	message: string;
	/** Schema field id (or source column name for parse/mapping issues). */
	field?: string;
	/** 0-based data row index, when the issue belongs to a specific row. */
	row?: number;
}

export type IntakeFieldType = 'text' | 'number';

export interface IntakeFieldDefinition {
	id: string;
	label: string;
	description?: string;
	type: IntakeFieldType;
	required: boolean;
	/** Numeric bounds — only checked when explicitly declared. */
	min?: number;
	max?: number;
	/** Closed value list — only checked when explicitly declared. */
	allowedValues?: readonly string[];
}

export interface IntakeSchema {
	id: string;
	title: string;
	fields: readonly IntakeFieldDefinition[];
	/** Optional schema-level validation, run per normalized record. */
	validateRecord?: (record: NormalizedIntakeRecord) => IntakeIssue[];
}

/**
 * One record of raw string values keyed by schema field id, plus any
 * unknown source columns — preserved verbatim, never dropped.
 */
export interface RawIntakeRecord {
	values: Record<string, string>;
	unknown: Record<string, string>;
}

/** A normalized field keeps the raw value and records what changed. */
export interface NormalizedFieldValue {
	raw: string;
	/** Normalized value; `undefined` means missing/blank. */
	value: string | number | undefined;
	changed: boolean;
	issues: IntakeIssue[];
}

export interface NormalizedIntakeRecord {
	fields: Record<string, NormalizedFieldValue>;
	unknown: Record<string, string>;
}

export interface IntakeValidationResult {
	records: NormalizedIntakeRecord[];
	/** All issues (normalization + validation), row-indexed where applicable. */
	issues: IntakeIssue[];
	errorCount: number;
	warningCount: number;
	infoCount: number;
}

/** UI-facing lifecycle states for an intake session. */
export type IntakeStatus =
	| 'empty'
	| 'editing'
	| 'parsing'
	| 'mapping'
	| 'validation-failed'
	| 'ready'
	| 'confirmed';

/** Instrument-ready data, produced only after successful confirmation. */
export interface ConfirmedIntake {
	schemaId: string;
	confirmedAt: string;
	records: Array<Record<string, string | number | undefined>>;
}
