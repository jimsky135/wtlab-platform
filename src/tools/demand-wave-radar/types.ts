// Demand Wave Radar — instrument types (Sprint 011, the seventh and last
// instrument in the catalog to leave placeholder state).
//
// Unlike every prior instrument this one holds no stock position at all.
// Its entire input is a set of MONTHLY AVERAGES measured over different
// windows of the same history, and its entire job is to keep the highest
// of them visible and derive a defensive coverage level from it.
//
// The seven windows are deliberately NOT a time series: Annual, H1/H2 and
// Q1..Q4 overlap by design — they are different lenses on the same span,
// not consecutive periods. So the engine compares them; it never sequences
// them, never interpolates between them, and never infers a window the
// user did not provide.

/** The seven comparable measurement windows, in canonical display order. */
export const DEMAND_WINDOW_IDS = ['annual', 'h1', 'h2', 'q1', 'q2', 'q3', 'q4'] as const;

/**
 * A window id. Doubles as the intake schema field id and the manual form
 * control name — one vocabulary end to end, so a window never has to be
 * translated between layers.
 */
export type DemandWindowId = (typeof DEMAND_WINDOW_IDS)[number];

/**
 * Raw input, one string per window. Every window is optional: a blank
 * string means "no data for this window" and is dropped, never coerced
 * to 0 — a window with no history is not a window with zero demand.
 */
export type DemandWaveRawInput = Record<DemandWindowId, string>;

/** One window that carried a usable number. */
export interface DemandWindowAverage {
	window: DemandWindowId;
	monthlyAverage: number;
}

/**
 * Validated input: only the windows the user actually provided, in
 * canonical order. Never zero-filled — `windows.length` is how many
 * windows really had data, which is what the wave renders.
 */
export interface DemandWaveValidatedInput {
	windows: readonly DemandWindowAverage[];
}

export interface DemandWaveThresholds {
	/** Months of the highest observed monthly average to hold as defensive coverage. */
	defensiveCoverageMonths: number;
}

/**
 * v0.1 rule: defend against the worst month-rate any window has actually
 * shown, for three months. The multiplier is a declared threshold rather
 * than a literal so the rule stays visible and adjustable.
 */
export const DEFAULT_DEMAND_WAVE_THRESHOLDS: DemandWaveThresholds = {
	defensiveCoverageMonths: 3,
};

export interface DemandWaveOutput {
	/**
	 * Every provided window, canonical order preserved. The engine keeps
	 * all of them — collapsing to the maximum alone would hide exactly the
	 * spread between time scales this instrument exists to show.
	 */
	windows: readonly DemandWindowAverage[];
	highestMonthlyAverage: number;
	/** Which window produced the highest average. Ties resolve to canonical order. */
	highestWindow: DemandWindowId;
	/** highestMonthlyAverage × defensiveCoverageMonths. */
	defensiveCoverage: number;
	/** Echoed so presentation can state the rule without hardcoding the multiplier. */
	defensiveCoverageMonths: number;
}
