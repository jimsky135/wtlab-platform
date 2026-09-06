// Demand Wave Radar engine — instrument business logic. v0.1 rules
// (Sprint 011):
//   highestMonthlyAverage = MAX(provided window averages)
//   highestWindow         = the window that produced it; on a tie the
//                           first window in canonical order wins, so the
//                           same input always names the same source
//   defensiveCoverage     = highestMonthlyAverage × defensiveCoverageMonths
//
// Every provided window is passed through untouched. Deliberately absent:
// no classification, no risk status, no trend, no projection. This engine
// reports what the history already measured — the moment it started
// scoring "is demand accelerating" it would be forecasting, which is out
// of scope for v0.1 by design.

import {
	DEFAULT_DEMAND_WAVE_THRESHOLDS,
	type DemandWaveOutput,
	type DemandWaveThresholds,
	type DemandWaveValidatedInput,
	type DemandWindowAverage,
} from './types.ts';

/** Highest average; ties keep the earliest canonical window (strict >). */
export function highestWindowAverage(
	windows: readonly DemandWindowAverage[]
): DemandWindowAverage | undefined {
	let highest: DemandWindowAverage | undefined;
	for (const candidate of windows) {
		if (highest === undefined || candidate.monthlyAverage > highest.monthlyAverage) {
			highest = candidate;
		}
	}
	return highest;
}

export function analyzeDemandWave(
	input: DemandWaveValidatedInput,
	thresholds: DemandWaveThresholds = DEFAULT_DEMAND_WAVE_THRESHOLDS
): DemandWaveOutput {
	const highest = highestWindowAverage(input.windows);

	// validate guarantees at least one window; this keeps the engine total
	// if it is ever called directly with an empty set.
	const highestMonthlyAverage = highest?.monthlyAverage ?? 0;
	const highestWindow = highest?.window ?? 'annual';

	return {
		windows: input.windows,
		highestMonthlyAverage,
		highestWindow,
		defensiveCoverage: highestMonthlyAverage * thresholds.defensiveCoverageMonths,
		defensiveCoverageMonths: thresholds.defensiveCoverageMonths,
	};
}
