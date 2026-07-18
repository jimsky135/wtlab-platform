// Dead Stock engine v0.1 — transparent, deterministic rules. Documented
// model (see docs/engineering.md):
//
//   coverageMonths   = currentStock / recentMonthlyConsumption (undefined when consumption = 0)
//   supportedQty     = max(futureDemand ?? 0, consumption × highCoverageMonths)
//   excessQuantity   = max(0, currentStock − supportedQty)
//   futureDemandSupport = futureDemand known and ≥ currentStock
//
// Classification (first match wins, most conclusive first):
//   no stock                                → healthy (nothing at risk)
//   demand fully supports stock            → healthy  FUTURE_DEMAND_SUPPORT
//   consumption = 0:
//     demand known 0 AND age ≥ deadMonths  → dead-stock
//     otherwise                            → dormant (uncertainty or demand prevents dead verdict)
//   consumption > 0:
//     coverage ≥ excessCoverageMonths      → excess-exposure
//     coverage ≥ highCoverageMonths        → slow-moving
//     otherwise                            → healthy
//
// Exposure: dead-stock exposes full stock; others expose excessQuantity.
// Priority: dead/excess = high, dormant/slow = medium, healthy = low.

import type { MessageCode } from '../../platform/message-codes.ts';
import type {
	DeadStockAnalysis,
	DeadStockAnalysisInput,
	DeadStockClassification,
	DeadStockItemInput,
	DeadStockItemResult,
	DeadStockThresholds,
	DormancyStatus,
	ReasonCode,
} from './types.ts';

const RECOMMENDED_ACTION: Record<DeadStockClassification, string> = {
	healthy: 'No action needed — keep monitoring.',
	'slow-moving': 'Reduce or pause replenishment; review whether coverage this long is intended.',
	dormant: 'Confirm whether future demand is real; if not, plan drawdown or disposal.',
	'dead-stock': 'No consumption and no known demand — plan write-down, disposal, or resale.',
	'excess-exposure': 'Stock materially exceeds supported demand — stop inbound and work down the excess.',
};

const RECOMMENDED_ACTION_CODE: Record<DeadStockClassification, MessageCode> = {
	healthy: 'DEAD_STOCK_ACTION_HEALTHY',
	'slow-moving': 'DEAD_STOCK_ACTION_SLOW_MOVING',
	dormant: 'DEAD_STOCK_ACTION_DORMANT',
	'dead-stock': 'DEAD_STOCK_ACTION_DEAD_STOCK',
	'excess-exposure': 'DEAD_STOCK_ACTION_EXCESS_EXPOSURE',
};

const PRIMARY_WARNING: Record<DeadStockClassification, string | undefined> = {
	healthy: undefined,
	'slow-moving': 'Coverage significantly exceeds the expected need.',
	dormant: 'No recent consumption — classification held back from dead stock only by demand or uncertainty.',
	'dead-stock': 'No recent movement and explicitly no future demand.',
	'excess-exposure': 'Quantity materially exceeds demand-supported inventory.',
};

const PRIMARY_WARNING_CODE: Record<DeadStockClassification, MessageCode | undefined> = {
	healthy: undefined,
	'slow-moving': 'DEAD_STOCK_WARNING_SLOW_MOVING',
	dormant: 'DEAD_STOCK_WARNING_DORMANT',
	'dead-stock': 'DEAD_STOCK_WARNING_DEAD_STOCK',
	'excess-exposure': 'DEAD_STOCK_WARNING_EXCESS_EXPOSURE',
};

function dormancy(age: number | undefined, thresholds: DeadStockThresholds): DormancyStatus {
	if (age === undefined) return 'unknown';
	if (age >= thresholds.deadMonths) return 'long-dormant';
	if (age >= thresholds.dormantMonths) return 'dormant';
	return 'active';
}

function classifyItem(input: DeadStockItemInput, thresholds: DeadStockThresholds): DeadStockItemResult {
	const reasons: ReasonCode[] = [];
	const coverageMonths =
		input.recentMonthlyConsumption > 0 ? input.currentStock / input.recentMonthlyConsumption : undefined;
	const dormancyStatus = dormancy(input.monthsSinceLastMovement, thresholds);
	const futureDemandSupport = input.futureDemand !== undefined && input.futureDemand >= input.currentStock;

	const supportedQuantity = Math.max(
		input.futureDemand ?? 0,
		input.recentMonthlyConsumption * thresholds.highCoverageMonths
	);
	const excessQuantity = Math.max(0, input.currentStock - supportedQuantity);

	if (input.recentMonthlyConsumption === 0) reasons.push('NO_CONSUMPTION_DATA');
	else reasons.push('ACTIVE_CONSUMPTION');
	if (dormancyStatus === 'dormant' || dormancyStatus === 'long-dormant') reasons.push('NO_RECENT_MOVEMENT');
	if (dormancyStatus === 'unknown') reasons.push('UNKNOWN_MOVEMENT_AGE');
	if (input.futureDemand === 0) reasons.push('NO_FUTURE_DEMAND');
	if (futureDemandSupport && input.currentStock > 0) reasons.push('FUTURE_DEMAND_SUPPORT');
	if (coverageMonths !== undefined && coverageMonths >= thresholds.highCoverageMonths) reasons.push('HIGH_COVERAGE');
	if (excessQuantity > 0) reasons.push('EXCESS_QUANTITY');

	let classification: DeadStockClassification;
	if (input.currentStock <= 0) {
		classification = 'healthy';
		reasons.length = 0;
		reasons.push('NO_STOCK');
	} else if (futureDemandSupport) {
		classification = 'healthy';
	} else if (input.recentMonthlyConsumption === 0) {
		const explicitlyNoDemand = input.futureDemand === 0;
		const longDormant =
			input.monthsSinceLastMovement !== undefined && input.monthsSinceLastMovement >= thresholds.deadMonths;
		classification = explicitlyNoDemand && longDormant ? 'dead-stock' : 'dormant';
	} else if (coverageMonths !== undefined && coverageMonths >= thresholds.excessCoverageMonths) {
		classification = 'excess-exposure';
	} else if (coverageMonths !== undefined && coverageMonths >= thresholds.highCoverageMonths) {
		classification = 'slow-moving';
	} else {
		classification = 'healthy';
	}

	const exposedQuantity = classification === 'dead-stock' ? input.currentStock : excessQuantity;
	const exposureValue = input.unitCost !== undefined ? input.unitCost * exposedQuantity : undefined;

	const priority =
		classification === 'dead-stock' || classification === 'excess-exposure'
			? 'high'
			: classification === 'dormant' || classification === 'slow-moving'
				? 'medium'
				: 'low';

	return {
		item: input.item,
		classification,
		coverageMonths,
		dormancyStatus,
		futureDemandSupport,
		excessQuantity,
		exposureValue,
		priority,
		reasonCodes: reasons,
		primaryWarning: PRIMARY_WARNING[classification],
		recommendedAction: RECOMMENDED_ACTION[classification],
		primaryWarningCode: PRIMARY_WARNING_CODE[classification],
		recommendedActionCode: RECOMMENDED_ACTION_CODE[classification],
	};
}

const SEVERITY_ORDER: Record<DeadStockClassification, number> = {
	'dead-stock': 0,
	'excess-exposure': 1,
	dormant: 2,
	'slow-moving': 3,
	healthy: 4,
};

export function analyzeDeadStock(input: DeadStockAnalysisInput): DeadStockAnalysis {
	const items = input.items.map((item) => classifyItem(item, input.thresholds));

	const counts: Record<DeadStockClassification, number> = {
		healthy: 0,
		'slow-moving': 0,
		dormant: 0,
		'dead-stock': 0,
		'excess-exposure': 0,
	};
	let totalExcessQuantity = 0;
	let totalExposureValue = 0;
	let itemsWithoutUnitCost = 0;
	for (const item of items) {
		counts[item.classification] += 1;
		totalExcessQuantity += item.excessQuantity;
		if (item.exposureValue !== undefined) totalExposureValue += item.exposureValue;
		else itemsWithoutUnitCost += 1;
	}

	const topRiskItems = [...items]
		.sort((a, b) => {
			const bySeverity = SEVERITY_ORDER[a.classification] - SEVERITY_ORDER[b.classification];
			if (bySeverity !== 0) return bySeverity;
			return (b.exposureValue ?? b.excessQuantity) - (a.exposureValue ?? a.excessQuantity);
		})
		.filter((item) => item.classification !== 'healthy')
		.slice(0, 5)
		.map((item) => item.item);

	return {
		items,
		summary: {
			totalItems: items.length,
			counts,
			totalExcessQuantity,
			totalExposureValue,
			itemsWithoutUnitCost,
			topRiskItems,
		},
		thresholds: input.thresholds,
	};
}
