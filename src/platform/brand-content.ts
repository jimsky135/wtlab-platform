// Brand-entry homepage content. Locale-neutral data only: ids, asset paths
// and outbound URLs. Every piece of display text (episode names, article
// titles, alt text) lives in the i18n dictionaries under `brandHome`,
// keyed by the episode id used here.
//
// Honesty rule (docs/notes/homepage-direction-v0.1.md): only list things
// that really exist. Each entry below points at a published article on
// Jim's Talk; the comics themselves have no page on WTLab yet.

import type { BrandEpisodeId } from '../i18n/types.ts';

export interface BrandEpisode {
	id: BrandEpisodeId;
	/** Short episode code shown on the label, e.g. "EP.001". Not translated. */
	code: string;
	/** Path under /public. */
	image: string;
	width: number;
	height: number;
	/** The matching plain-talk essay, hosted off-site on Jim's Talk. */
	articleUrl: string;
}

export const brandEpisodes: readonly BrandEpisode[] = [
	{
		id: 'ep001',
		code: 'EP.001',
		image: '/brand/comics/ep001-boss.jpg',
		width: 1254,
		height: 1254,
		articleUrl: 'https://jimmychiu.name/starter-ep01/',
	},
	{
		id: 'ep002',
		code: 'EP.002',
		image: '/brand/comics/ep002-fishtank.jpg',
		width: 1536,
		height: 1024,
		articleUrl: 'https://jimmychiu.name/starter-ep02/',
	},
	{
		id: 'ep003',
		code: 'EP.003',
		image: '/brand/comics/ep003-fotiaoqiang.jpg',
		width: 1402,
		height: 1122,
		articleUrl: 'https://jimmychiu.name/starter-ep03/',
	},
	{
		id: 'ep004',
		code: 'EP.004',
		image: '/brand/comics/ep004-convenience-store.jpg',
		width: 1536,
		height: 1024,
		articleUrl: 'https://jimmychiu.name/ep004/',
	},
];

export const brandImages = {
	character: { src: '/brand/wheelchair-bro-character.png', width: 1197, height: 1032 },
	lettering: { src: '/brand/yi-ha-kaobei-lettering.png', width: 1136, height: 591 },
} as const;
