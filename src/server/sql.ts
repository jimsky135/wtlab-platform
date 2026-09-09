// Minimal SQL surface the guest workspace needs.
//
// Deliberately our own interface rather than Cloudflare's D1 types: D1
// satisfies this structurally, so the server modules carry no Cloudflare
// dependency and can be driven by any prepare/bind/all/run implementation —
// which is how the isolation tests run the real SQL against node:sqlite.

export interface SqlStatement {
	bind(...values: unknown[]): SqlStatement;
	all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
	run(): Promise<unknown>;
}

export interface SqlDatabase {
	prepare(sql: string): SqlStatement;
}
