// Tool Contract — TypeScript types for Tool Interface Proposal v0.2.
// Defines the shape every WTLab tool must implement. No tool-specific
// logic or fields belong here; see each tool's own Tool Specification.
//
// Scope note (ADR-0001): tool UI belongs to each tool's own Astro
// Component, not this contract. This file only covers the calculation
// side — initialize, validate, calculate — not rendering.
//
// Sprint 006, Task 013: ValidationResult's failure branch carries
// ValidationMessage[] instead of string[] so validation failures can be
// localized at the presentation boundary. This is a deliberate, contained
// touch of the v0.2 contract — see the Sprint 006 report's Architecture
// Review for why it doesn't rise to a "major breaking contract change"
// (no CSV/Shared Intake/production-behavior impact; the discriminated
// union shape and every other field are unchanged).

import type { ValidationMessage } from './message-codes.ts';

/** A tool's own development/publication lifecycle (Interface Proposal §A). */
export type ToolStatus = 'draft' | 'active' | 'deprecated';

/**
 * Static metadata every tool must declare.
 * `status` and `enabled` are independent axes: `status` is the tool's own
 * lifecycle, `enabled` is whether the platform currently allows it to run.
 * `category` stays a free-form string until a category taxonomy is
 * formally confirmed — no closed list exists yet.
 */
export interface ToolMetadata {
	id: string;
	name: string;
	description: string;
	category: string;
	version: string;
	status: ToolStatus;
	enabled: boolean;
}

/**
 * Execution context the platform shell passes into `initialize`.
 * MVP scope only — no user, payment, locale, database, or session data.
 */
export interface PlatformContext {
	platformVersion: string;
}

/** Outcome of `initialize`, per Interface Proposal §B ("就緒" or "初始化失敗"). */
export type InitializeResult = { ready: true } | { ready: false; reason: string };

/**
 * Outcome of `validate`. A discriminated union, not a boolean: success
 * carries the normalized `TValidatedInput` that `calculate` can safely
 * consume; failure carries one or more structured validation messages
 * (stable code + params + an English fallback rendering). This is the
 * boundary where raw UI input (e.g. HTML form string values) becomes a
 * type `calculate` can trust.
 */
export type ValidationResult<TValidatedInput> =
	| { valid: true; data: TValidatedInput }
	| { valid: false; errors: ValidationMessage[] };

/**
 * A tool's calculation behavior (Interface Proposal §B, minus `render` —
 * see the scope note above). `TRawInput`/`TValidatedInput`/`TOutput` are
 * tool-specific; the platform never assumes a shape. `TValidatedInput`
 * defaults to `TRawInput` for tools where validation doesn't change the
 * type, only whether it's accepted.
 */
export interface ToolBehavior<TRawInput = unknown, TValidatedInput = TRawInput, TOutput = unknown> {
	initialize(context: PlatformContext): InitializeResult | Promise<InitializeResult>;
	validate(input: TRawInput): ValidationResult<TValidatedInput>;
	calculate(input: TValidatedInput): TOutput;
}

/** A complete tool: its declared metadata plus its calculation contract. */
export interface Tool<TRawInput = unknown, TValidatedInput = TRawInput, TOutput = unknown>
	extends ToolBehavior<TRawInput, TValidatedInput, TOutput> {
	metadata: ToolMetadata;
}
