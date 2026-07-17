// Arrival Collision Detector — instrument types. The engine input is a
// batch of arrivals keyed by month ('YYYY-MM'); adapters produce this
// from confirmed intake rows (strict ISO dates, no format guessing).

export interface ArrivalRecord {
	/** 'YYYY-MM' — derived from a strict ISO 'YYYY-MM-DD' arrival date. */
	monthKey: string;
	quantity: number;
	container: string | undefined;
	supplier: string | undefined;
}

export interface ArrivalAnalysisInput {
	arrivals: ArrivalRecord[];
	/** Optional warehouse intake capacity per month (quantity units). */
	monthlyCapacity: number | undefined;
}

export interface MonthAggregate {
	monthKey: string;
	totalQuantity: number;
	batchCount: number;
	/** Distinct container labels landing this month (unlabeled excluded). */
	containerCount: number;
	/** Distinct supplier labels landing this month (unlabeled excluded). */
	supplierCount: number;
	/** This month's share of total arriving quantity (0..1). */
	share: number;
	/** true/false when capacity declared; undefined when not. */
	overCapacity: boolean | undefined;
}

export type CollisionLevel = 'none' | 'moderate' | 'severe';

export interface ArrivalWarning {
	severity: 'high' | 'medium';
	monthKey: string;
	message: string;
}

export interface ArrivalAnalysis {
	months: MonthAggregate[];
	peakMonth: string | undefined;
	collisionLevel: CollisionLevel;
	/** Ordered most severe first. */
	warnings: ArrivalWarning[];
	suggestion: string;
}
