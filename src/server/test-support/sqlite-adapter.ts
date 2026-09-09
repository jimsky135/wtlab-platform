// Test-only adapter: node:sqlite behind the same SqlDatabase interface D1
// satisfies.
//
// This exists so the isolation tests execute the REAL SQL from
// guest-workspace.ts — including every `WHERE session_id = ?` — rather than a
// hand-written fake that could be correctly scoped while the production
// statements are not. Nothing in src/ or worker/ imports this.

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { SqlDatabase, SqlStatement } from '../sql.ts';

const MIGRATION = fileURLToPath(new URL('../../../migrations/0001_guest_workspace.sql', import.meta.url));

function wrap(db: DatabaseSync, sql: string, bound: unknown[]): SqlStatement {
	return {
		bind(...values: unknown[]): SqlStatement {
			return wrap(db, sql, values);
		},
		async all<T>(): Promise<{ results: T[] }> {
			const rows = db.prepare(sql).all(...(bound as never[]));
			return { results: rows.map((row) => ({ ...row })) as T[] };
		},
		async run(): Promise<unknown> {
			return db.prepare(sql).run(...(bound as never[]));
		},
	};
}

export interface TestDatabase extends SqlDatabase {
	close(): void;
	/** Row count across every session — used to prove a sweep left others alone. */
	totalRows(): number;
}

/** A fresh in-memory database with the production migration applied. */
export function createTestDatabase(): TestDatabase {
	const db = new DatabaseSync(':memory:');
	db.exec(readFileSync(MIGRATION, 'utf8'));

	return {
		prepare(sql: string): SqlStatement {
			return wrap(db, sql, []);
		},
		close(): void {
			db.close();
		},
		totalRows(): number {
			const row = db.prepare('SELECT COUNT(*) AS total FROM guest_workspace_records').get() as {
				total: number;
			};
			return Number(row.total);
		},
	};
}
