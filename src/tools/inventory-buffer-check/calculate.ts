import type { ArrivalRisk, InventoryBufferOutput, InventoryBufferValidatedInput, RiskStatus } from './types';

/**
 * Pure calculation core per Tool Specification v0.2 §C.
 * S = currentStock, D = monthlyConsumption, L = leadTimeMonths,
 * B = safetyBufferMonths, T = inTransitQuantity, A = arrivalTimeMonths.
 */
export function calculateInventoryBuffer(input: InventoryBufferValidatedInput): InventoryBufferOutput {
	const S = input.currentStock;
	const D = input.monthlyConsumption;
	const L = input.leadTimeMonths;
	const B = input.safetyBufferMonths;
	const T = input.inTransitQuantity;
	const A = input.arrivalTimeMonths;

	const currentCoverageMonths = S / D;
	const totalCoverageMonths = T !== undefined ? (S + T) / D : undefined;
	const minimumSafetyStock = D * B;
	const reorderPoint = D * (L + B);

	const arrivalRisk: ArrivalRisk =
		A === undefined
			? 'arrival-time-not-provided'
			: currentCoverageMonths < A
				? 'possible-shortage'
				: 'can-cover-until-arrival';

	const riskStatus: RiskStatus =
		currentCoverageMonths < L ? 'high-risk' : currentCoverageMonths < L + B ? 'caution' : 'safe';

	return {
		currentCoverageMonths,
		totalCoverageMonths,
		minimumSafetyStock,
		reorderPoint,
		arrivalRisk,
		riskStatus,
	};
}
