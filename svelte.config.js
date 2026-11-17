import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		prerender: {
			// 끝말잇기 · 낱말퍼즐 해설은 지난 날만 굽는다 — 첫 날(11/5 · 11/19) 전에는 0쪽이라 이 라우트만 봐준다
			handleUnseenRoutes: ({ routes, message }) => {
				const ok = ['/kkeut/answer/[date]', '/crossword/answer/[date]'];
				if (routes.some((r) => !ok.includes(r))) throw new Error(message);
			}
		}
	}
};

export default config;
