<script lang="ts">
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import CubeDie from '$lib/components/CubeDie.svelte';
	import { parseEq } from '$lib/matchstick';

	/**
	 * 놀이 카드(v2, 2026-10-14) — 메인 「놀이 고르기」와 /games가 같은 카드를 쓴다.
	 * 유형 이름은 어디서 눌러도 그 유형의 홈으로 간다(10/14 점검: 「발견형」이 메인에서는 연습,
	 * 푸터에서는 소개로 갔다). 유형 안의 갈래(단계 도전·그림 퍼즐 등)는 sub 링크로 단다.
	 */
	let {
		counts,
		full = false
	}: {
		counts: { discover: number; trivia: number; match: number; cube: number; chosung: number };
		/** /games — 갈래 링크까지 보인다 */
		full?: boolean;
	} = $props();

	const demo = parseEq('8 - 0 = 8');

	let games = $derived([
		{
			key: 'match',
			name: '성냥개비',
			count: counts.match,
			line: '성냥을 옮겨 식을 참으로',
			href: '/matchstick',
			sub: [
				{ label: '오늘의 성냥개비', href: '/matchstick' },
				{ label: '단계 도전', href: '/matchstick#stages' },
				{ label: '친구와 대결', href: '/matchstick/duel' },
				{ label: '그림 퍼즐', href: '/matchstick/picture' }
			],
			fresh: true
		},
		{
			key: 'cho',
			name: '초성 퀴즈',
			count: counts.chosung,
			line: '초성만 보고 낱말 맞히기',
			href: '/chosung',
			sub: [
				{ label: '오늘의 초성', href: '/chosung' },
				{ label: '분야 골라 풀기', href: '/chosung#fields' }
			]
		},
		{
			key: 'trivia',
			name: '상식 퀴즈',
			count: counts.trivia,
			line: '19개 분야, 해설과 함께',
			href: '/trivia',
			sub: [
				{ label: '바로 풀기', href: '/play?filter=trivia' },
				{ label: '단계 도전', href: '/trivia/stages' },
				{ label: '친구와 대결', href: '/trivia/duel' },
				{ label: '분야별 문제', href: '/trivia#fields' }
			]
		},
		{
			key: 'discover',
			name: '발견형',
			count: counts.discover,
			line: '예시 속 규칙을 찾아요',
			href: '/discover',
			sub: [
				{ label: '바로 풀기', href: '/play?filter=puzzle' },
				{ label: '푸는 법', href: '/guide' }
			]
		},
		{
			key: 'cube',
			name: '전개도',
			count: counts.cube,
			line: '머릿속으로 접어 주사위 맞히기',
			href: '/cubenet',
			sub: [
				{ label: '바로 풀기', href: '/cubenet' },
				{ label: '푸는 법', href: '/cubenet/guide' }
			]
		},
		{
			key: 'mix',
			name: '무한 연습',
			count: counts.discover + counts.trivia + counts.match + counts.cube,
			line: '네 유형을 섞어서 계속',
			href: '/play',
			sub: []
		}
	]);
</script>

<div class="games" class:full>
	{#each games as g (g.key)}
		<div class="game">
			<a class="main" href={g.href}>
				<div class="vis {g.key}" aria-hidden="true">
					{#if g.key === 'match'}
						<MatchstickBoard board={demo} picked={null} onstick={() => {}} interactive={false} />
					{:else if g.key === 'cho'}
						<span class="tile">ㅅ</span><span class="tile">ㄱ</span><span class="tile">ㅊ</span>
					{:else if g.key === 'trivia'}
						<span class="qb">A</span><span class="ql"></span>
						<span class="qb on">B</span><span class="ql on"></span>
						<span class="qb">C</span><span class="ql"></span>
					{:else if g.key === 'discover'}
						<span class="rr">나무 → 2</span>
						<span class="rr">가나다 → 1</span>
						<span class="rr">고구마 → <b>?</b></span>
					{:else if g.key === 'cube'}
						<CubeDie view={[2, 3, 4]} size={52} />
					{:else}
						<span class="inf">∞</span>
					{/if}
				</div>
				<div class="txt">
					<b>{g.name}{#if g.fresh}<i>새 놀이</i>{/if}</b>
					<span class="cnt">{g.count.toLocaleString()}문제</span>
					<span class="line">{g.line}</span>
				</div>
			</a>
			{#if full && g.sub.length}
				<div class="subs">
					{#each g.sub as s (s.label)}
						<a href={s.href}>{s.label}</a>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.games {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.games.full {
		grid-template-columns: 1fr;
	}
	.game {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.main {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 10px;
		text-decoration: none;
		color: inherit;
		flex: 1;
	}
	.full .main {
		flex-direction: row;
		align-items: center;
		padding: 12px;
	}
	.vis {
		height: 72px;
		border-radius: 12px;
		background: var(--panel-2);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		overflow: hidden;
	}
	.full .vis {
		width: 112px;
		flex: none;
	}
	.vis.match {
		background: var(--board-bg);
		padding: 0 4px;
	}
	.vis.match :global(.mboard) {
		padding: 6px 4px;
		background: transparent;
	}
	.tile {
		width: 26px;
		height: 30px;
		border-radius: 8px;
		background: var(--panel);
		border: 1.5px solid var(--border-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 900;
		font-size: 15px;
	}
	.vis.trivia {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 6px;
		align-content: center;
		padding: 0 14px;
	}
	.qb {
		width: 15px;
		height: 15px;
		border-radius: 50%;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		font-size: 9px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
	}
	.qb.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.ql {
		height: 6px;
		border-radius: 3px;
		background: var(--border);
	}
	.ql.on {
		background: #b8dcc6;
	}
	.vis.discover {
		flex-direction: column;
		gap: 1px;
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
	}
	.rr b {
		color: var(--accent-2);
	}
	.inf {
		font-size: 34px;
		font-weight: 900;
		color: var(--accent-text);
	}
	.txt {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}
	.txt b {
		font-size: 16px;
		font-weight: 900;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.txt i {
		font-style: normal;
		font-size: 10.5px;
		font-weight: 800;
		color: #fff;
		background: var(--accent-2);
		border-radius: 5px;
		padding: 1px 5px;
	}
	.cnt {
		font-size: 12.5px;
		font-weight: 800;
		color: var(--accent-text);
	}
	.line {
		font-size: 12.5px;
		color: var(--muted);
		line-height: 1.5;
		word-break: keep-all;
	}
	.subs {
		display: flex;
		border-top: 1px solid var(--border);
	}
	.subs a {
		flex: 1;
		text-align: center;
		padding: 10px 4px;
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
	}
	.subs a + a {
		border-left: 1px solid var(--border);
	}
</style>
