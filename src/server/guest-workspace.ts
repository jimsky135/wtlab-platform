// Guest temporary workspace storage.
//
// ONE fixed table, permanently present. Guest data lives as rows scoped by a
// server-derived session id — never a table per Guest, never a table created
// or dropped at runtime. Clearing a workspace deletes rows; the table stays.
//
// Every statement below carries `WHERE session_id = ?`. There is no query in
// this module that can read or write across sessions, and no function takes
// an "owner" argument from anywhere except the caller's server-derived id.
//
// The payload is an opaque string. This is a prototype container, not the
// final Workspace domain model: it deliberately holds generic working data
// and assumes no industry vocabulary.

import type { SqlDatabase } from './sql.ts';

/**
 * The ONLY table this prototype touches. Every statement below interpolates
 * this constant and nothing else — no table name is ever derived from a
 * request, and there is no dynamic table selection, no generic query
 * endpoint, and no arbitrary SQL surface.
 *
 * This is the outer of two independent limits:
 *
 *   Table lock       — a guest can only reach guest_workspace_records
 *   Row ownership    — within it, only rows whose session_id matches the
 *                      server-resolved owner (`auth:` / `anon:` prefixed)
 *
 * Both must hold. Neither replaces the other: the lock alone would let one
 * guest read another's rows, and ownership alone would leave the rest of the
 * database reachable if a table name ever became caller-supplied.
 */
export const GUEST_WORKSPACE_TABLE = 'guest_workspace_records';

/** Bounds a prototype payload so one Guest cannot fill the table. */
export const MAX_PAYLOAD_BYTES = 64 * 1024;
export const MAX_DATASETS_PER_SESSION = 50;

export interface GuestDataset {
	datasetId: string;
	payload: string;
	createdAt: string;
	updatedAt: string;
}

interface DatasetRow {
	dataset_id: string;
	payload: string;
	created_at: string;
	updated_at: string;
}

/** Dataset ids are caller-chosen labels, so keep them to a safe shape. */
const DATASET_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isDatasetId(value: string): boolean {
	return DATASET_ID_PATTERN.test(value);
}

/**
 * Insert or replace one dataset for this Guest.
 *
 * `created_at` is preserved across updates via the excluded-row upsert, so
 * "when did this Guest first store anything" survives edits.
 */
export async function putDataset(
	db: SqlDatabase,
	sessionId: string,
	datasetId: string,
	payload: string,
	now: string
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO ${GUEST_WORKSPACE_TABLE} (session_id, dataset_id, payload, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT(session_id, dataset_id) DO UPDATE SET
			   payload = excluded.payload,
			   updated_at = excluded.updated_at`
		)
		.bind(sessionId, datasetId, payload, now, now)
		.run();
}

/** Everything this Guest stored. Scoped by session id, never by anything else. */
export async function listDatasets(db: SqlDatabase, sessionId: string): Promise<GuestDataset[]> {
	const { results } = await db
		.prepare(
			`SELECT dataset_id, payload, created_at, updated_at
			 FROM ${GUEST_WORKSPACE_TABLE}
			 WHERE session_id = ?
			 ORDER BY dataset_id`
		)
		.bind(sessionId)
		.all<DatasetRow>();

	return results.map((row) => ({
		datasetId: row.dataset_id,
		payload: row.payload,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));
}

export async function countDatasets(db: SqlDatabase, sessionId: string): Promise<number> {
	const { results } = await db
		.prepare(`SELECT COUNT(*) AS total FROM ${GUEST_WORKSPACE_TABLE} WHERE session_id = ?`)
		.bind(sessionId)
		.all<{ total: number }>();
	return Number(results[0]?.total ?? 0);
}

/** Explicit clear — the immediate optimization, not the safety net. */
export async function clearWorkspace(db: SqlDatabase, sessionId: string): Promise<void> {
	await db.prepare(`DELETE FROM ${GUEST_WORKSPACE_TABLE} WHERE session_id = ?`).bind(sessionId).run();
}

/** Keeps a Guest's rows alive while they are still working. */
export async function touchWorkspace(db: SqlDatabase, sessionId: string, now: string): Promise<void> {
	await db
		.prepare(`UPDATE ${GUEST_WORKSPACE_TABLE} SET updated_at = ? WHERE session_id = ?`)
		.bind(now, sessionId)
		.run();
}

/**
 * The primary safety mechanism: delete rows untouched since `cutoffIso`.
 *
 * Browser-close events are best-effort and must never be the only way rows go
 * away (see ADR-0004). This sweep is what actually bounds the table. It is
 * written as a plain callable module so it can be tested and invoked without
 * committing to a scheduled deployment.
 *
 * The comparison is per-row `updated_at`, so a Guest who is still working is
 * never caught by a sweep aimed at an idle one.
 */
export async function deleteInactiveBefore(db: SqlDatabase, cutoffIso: string): Promise<void> {
	await db.prepare(`DELETE FROM ${GUEST_WORKSPACE_TABLE} WHERE updated_at < ?`).bind(cutoffIso).run();
}
