// Arrival Collision engine — instrument business logic. v0.1 rules
// (documented in docs/engineering.md):
//   share       = month quantity / total quantity
//   peak month  = highest total quantity (earliest wins a tie)
//   severe      = any month over declared capacity, OR the peak month
//                 has ≥2 batches and ≥60% of total quantity
//   moderate    = (not severe) peak month has ≥2 batches and ≥40% share
//   none        = otherwise (a single batch can never collide)
// Warning priority: capacity exceeded > severe concentration > moderate
// concentration > container stacking (≥3 distinct containers a month).

import type { ArrivalAnalysis, ArrivalAnalysisInput, ArrivalWarning, CollisionLevel, MonthAggregate } from './types.ts';

const SEVERE_SHARE = 0.6;
const MODERATE_SHARE = 0.4;
const CONTAINER_STACK_THRESHOLD = 3;

export function analyzeArrivals(input: ArrivalAnalysisInput): ArrivalAnalysis {
	const byMonth = new Map<string, { total: number; batches: number; containers: Set<string>; suppliers: Set<string> }>();
	for (const arrival of input.arrivals) {
		let month = byMonth.get(arrival.monthKey);
		if (!month) {
			month = { total: 0, batches: 0, containers: new Set(), suppliers: new Set() };
			byMonth.set(arrival.monthKey, month);
		}
		month.total += arrival.quantity;
		month.batches += 1;
		if (arrival.container !== undefined && arrival.container !== '') month.containers.add(arrival.container);
		if (arrival.supplier !== undefined && arrival.supplier !== '') month.suppliers.add(arrival.supplier);
	}

	const grandTotal = input.arrivals.reduce((sum, arrival) => sum + arrival.quantity, 0);
	const months: MonthAggregate[] = [...byMonth.entries()]
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.map(([monthKey, month]) => ({
			monthKey,
			totalQuantity: month.total,
			batchCount: month.batches,
			containerCount: month.containers.size,
			supplierCount: month.suppliers.size,
			share: grandTotal > 0 ? month.total / grandTotal : 0,
			overCapacity: input.monthlyCapacity !== undefined ? month.total > input.monthlyCapacity : undefined,
		}));

	const peak = months.reduce<MonthAggregate | undefined>(
		(best, month) => (best === undefined || month.totalQuantity > best.totalQuantity ? month : best),
		undefined
	);

	const anyOverCapacity = months.some((month) => month.overCapacity === true);
	const totalBatches = input.arrivals.length;

	let collisionLevel: CollisionLevel = 'none';
	if (anyOverCapacity || (peak !== undefined && peak.batchCount >= 2 && peak.share >= SEVERE_SHARE)) {
		collisionLevel = 'severe';
	} else if (peak !== undefined && peak.batchCount >= 2 && peak.share >= MODERATE_SHARE) {
		collisionLevel = 'moderate';
	}
	if (totalBatches < 2) collisionLevel = anyOverCapacity ? 'severe' : 'none';

	const warnings: ArrivalWarning[] = [];
	for (const month of months) {
		if (month.overCapacity === true) {
			warnings.push({
				severity: 'high',
				monthKey: month.monthKey,
				message: `${month.monthKey}: total arrivals (${month.totalQuantity}) exceed monthly capacity (${input.monthlyCapacity}).`,
				code: 'ARRIVAL_CAPACITY_EXCEEDED',
				params: { month: month.monthKey, total: month.totalQuantity, capacity: input.monthlyCapacity ?? 0 },
			});
		}
	}
	if (peak !== undefined && collisionLevel === 'severe' && peak.batchCount >= 2 && peak.share >= SEVERE_SHARE) {
		warnings.push({
			severity: 'high',
			monthKey: peak.monthKey,
			message: `${peak.monthKey}: ${Math.round(peak.share * 100)}% of all arriving quantity lands in one month across ${peak.batchCount} batches.`,
			code: 'ARRIVAL_CONCENTRATION_SEVERE',
			params: { month: peak.monthKey, percent: Math.round(peak.share * 100), batches: peak.batchCount },
		});
	}
	if (peak !== undefined && collisionLevel === 'moderate') {
		warnings.push({
			severity: 'medium',
			monthKey: peak.monthKey,
			message: `${peak.monthKey}: ${Math.round(peak.share * 100)}% of arriving quantity concentrates in one month.`,
			code: 'ARRIVAL_CONCENTRATION_MODERATE',
			params: { month: peak.monthKey, percent: Math.round(peak.share * 100) },
		});
	}
	for (const month of months) {
		if (month.containerCount >= CONTAINER_STACK_THRESHOLD) {
			warnings.push({
				severity: 'medium',
				monthKey: month.monthKey,
				message: `${month.monthKey}: ${month.containerCount} containers land in the same month — check unloading capacity.`,
				code: 'ARRIVAL_CONTAINER_STACKING',
				params: { month: month.monthKey, containers: month.containerCount },
			});
		}
	}

	const suggestion =
		collisionLevel === 'severe'
			? 'Split or reschedule arrivals to spread quantity across adjacent months.'
			: collisionLevel === 'moderate'
				? 'Review whether peak-month arrivals can be staggered.'
				: 'No significant arrival concentration detected.';
	const suggestionCode =
		collisionLevel === 'severe' ? 'SUGGESTION_SEVERE' : collisionLevel === 'moderate' ? 'SUGGESTION_MODERATE' : 'SUGGESTION_NONE';

	return {
		months,
		peakMonth: peak?.monthKey,
		collisionLevel,
		warnings,
		suggestion,
		suggestionCode,
	};
}
