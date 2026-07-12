// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// ADR-0001: Static Output — no server-side rendering in MVP.
export default defineConfig({
	output: 'static',
});
