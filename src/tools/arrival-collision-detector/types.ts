// Arrival Collision Detector — instrument types. The engine input is a
// batch of arrivals keyed by month ('YYYY-MM'); adapters produce this
// from confirmed intake rows (strict ISO dates, no format guessing).

import type { MessageCode, MessageParams } from '../../platform/message-codes.ts';

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
	/** English fallback — kept for backward compatibility (existing tests). */
	message: string;
	/** Stable, locale-independent form (Sprint 006, Task 014) — resolve via src/i18n/resolveMessage.ts. */
	code: MessageCode;
	params: MessageParams;
}

export interface ArrivalAnalysis {
	months: MonthAggregate[];
	peakMonth: string | undefined;
	collisionLevel: CollisionLevel;
	/** Ordered most severe first. */
	warnings: ArrivalWarning[];
	/** English fallback — kept for backward compatibility (existing tests). */
	suggestion: string;
	/** Stable, locale-independent form (Sprint 006, Task 014) — has no dynamic params. */
	suggestionCode: MessageCode;
}
