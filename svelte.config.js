import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		prerender: {
			// 끝말잇기 해설(/kkeut/answer/[date])은 지난 날만 굽는다 — 첫 날(11/5) 전에는 0쪽이라 이 라우트만 봐준다
			handleUnseenRoutes: ({ routes, message }) => {
				if (routes.some((r) => r !== '/kkeut/answer/[date]')) throw new Error(message);
			}
		}
	}
};

export default config;
