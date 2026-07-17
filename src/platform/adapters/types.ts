// Shared adapter contract. Promoted out of the water-level adapter in
// Sprint 004 — every instrument adapter returns the same outcome shape.

import type { IntakeIssue } from '../intake/types.ts';

export type AdapterOutcome<T> = { ok: true; data: T } | { ok: false; issues: IntakeIssue[] };
