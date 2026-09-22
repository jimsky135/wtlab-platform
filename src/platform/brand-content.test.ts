// The homepage may link a project's public demo, never its production
// site. The stocktake tool is the case in point: inv.wtlab.co is the real
// system behind a sign-in; invdemo.wtlab.co is the open demo.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { projectDemos } from './brand-content.ts';

const PRODUCTION_HOSTS = ['inv.wtlab.co'];

test('project demo links use https and never point at a production site', () => {
	for (const [id, demo] of Object.entries(projectDemos)) {
		if (!demo) continue;
		const url = new URL(demo.href);
		assert.equal(url.protocol, 'https:', `${id}: ${demo.href}`);
		assert.ok(!PRODUCTION_HOSTS.includes(url.hostname), `${id} must link the demo, not ${url.hostname}`);
	}
});
