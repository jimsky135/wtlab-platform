// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// ADR-0001: Static Output — no server-side rendering in MVP.
// `site` enables absolute canonical/hreflang URLs (Sprint 005.5 i18n) —
// it does not change routing, output mode, or build behavior.
export default defineConfig({
	output: 'static',
	site: 'https://www.wtlab.co',
});
