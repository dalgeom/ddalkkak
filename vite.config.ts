import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		// 스코프를 src로 못 박는다 — 기본값은 .claude/worktrees의 낡은 사본 수백 개까지
		// 주워서 "빨간 게 정상"인 스위트가 되고, 그 소음이 진짜 회귀를 가린다.
		include: ['src/**/*.test.ts']
	}
});
