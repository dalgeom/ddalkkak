<script lang="ts">
	import { ctaTrack } from '$lib/analytics';

	/**
	 * 다른 놀이(v2, 2026-10-14) — 유형 화면·읽을거리 맨 아래에 붙는다.
	 * 본문 중간 띠(DailyBand)는 4주 617번 보이고 18번 눌렸다(2.9%). 맨 아래 버튼은 14.2%였다.
	 * 그래서 띠를 걷고 맨 아래에 「오늘의 10문제」와 다른 놀이를 함께 둔다. 초성으로 들어온 사람의
	 * 2%만 홈까지 갔던 것처럼(10/14 점검) 유형끼리 이어지는 길이 없었다.
	 */
	let { current = '' }: { current?: 'match' | 'cho' | 'trivia' | 'discover' | 'cube' | '' } = $props();

	const ALL = [
		{ key: 'match', name: '성냥개비', href: '/matchstick' },
		{ key: 'cho', name: '초성 퀴즈', href: '/chosung' },
		{ key: 'trivia', name: '상식 퀴즈', href: '/trivia' },
		{ key: 'discover', name: '발견형', href: '/discover' },
		{ key: 'cube', name: '전개도', href: '/cubenet' }
	];
	let others = $derived(ALL.filter((g) => g.key !== current));
</script>

<section class="other">
	<h2>다른 놀이도 있어요</h2>
	<a class="daily" href="/" use:ctaTrack={'other'}>
		<span>
			<b>오늘의 10문제</b>
			<em>매일 자정에 새로 열려요</em>
		</span>
		<span class="arr" aria-hidden="true">→</span>
	</a>
	<div class="grid">
		{#each others as g (g.key)}
			<a href={g.href}>{g.name}</a>
		{/each}
		<a class="all" href="/games">놀이 전체</a>
	</div>
</section>

<style>
	.other {
		margin-top: 28px;
		padding-top: 18px;
		border-top: 1px solid var(--border);
	}
	h2 {
		font-size: 16px;
		font-weight: 900;
		margin-bottom: 10px;
	}
	.daily {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 14px 16px;
		border-radius: 16px;
		background: var(--accent);
		color: #fff;
		text-decoration: none;
		box-shadow: 0 4px 0 var(--accent-press);
	}
	.daily span:first-child {
		display: flex;
		flex-direction: column;
	}
	.daily b {
		font-size: 16px;
		font-weight: 900;
	}
	.daily em {
		font-style: normal;
		font-size: 12.5px;
		opacity: 0.9;
	}
	.arr {
		font-size: 18px;
		font-weight: 900;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		margin-top: 10px;
	}
	.grid a {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 46px;
		border-radius: 12px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		font-size: 13.5px;
		font-weight: 800;
		color: var(--text);
		text-decoration: none;
	}
	.grid a.all {
		color: var(--accent-text);
	}
</style>
