// Mode contract types were promoted to the shared platform module in
// Sprint 004 (src/platform/modes.ts). This re-export keeps existing
// import paths working; new code should import from the platform module.

export type { EntryMethod, ModeContract, ModeTier } from '../../../platform/modes.ts';
