<script lang="ts">
	import ProblemView from '$lib/components/ProblemView.svelte';
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import { parseEq } from '$lib/matchstick';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// 성냥개비는 문제(displayed) → 정답(solution)을 각각 읽기 전용 보드로 보여준다.
	let matchReveal = $state<boolean[]>([]);
	$effect(() => {
		matchReveal = data.match.map(() => false);
	});
</script>

<svelte:head>
	<title>{data.label} 오늘의 딸깍 — 지난 문제</title>
	<meta
		name="description"
		content="{data.label}의 오늘의 딸깍. 발견형 퍼즐 3, 상식 퀴즈 5, 성냥개비 3문제를 다시 풀어보세요."
	/>
	<link rel="canonical" href="https://ddalkkak-1c2.pages.dev/archive/{data.day}" />
</svelte:head>

<nav class="crumb">
	<a href="/archive">← 지난 문제</a>
</nav>
<h1>{data.label}</h1>

<section class="grp">
	<div class="grp-h"><Icon name="search" size={16} /><h2>오늘의 발견</h2></div>
	<div class="grid">
		{#each data.discover as p (p.id)}
			<ProblemView problem={p} />
		{/each}
	</div>
</section>

<section class="grp">
	<div class="grp-h"><Icon name="book" size={16} /><h2>오늘의 상식</h2></div>
	<div class="grid">
		{#each data.trivia as p (p.id)}
			<ProblemView problem={p} />
		{/each}
	</div>
</section>

<div class="mid-ad"><AdSlot label="지난 문제" /></div>

<section class="grp">
	<div class="grp-h"><Icon name="match" size={16} /><h2>오늘의 성냥개비</h2></div>
	<div class="grid">
		{#each data.match as m, i (i)}
			<article class="mv">
				<div class="mv-board"><MatchstickBoard board={parseEq(m.displayed)} picked={null} onstick={() => {}} interactive={false} label={m.displayed} /></div>
				<div class="mv-cap">성냥 하나만 옮겨 참으로</div>
				{#if matchReveal[i]}
					<div class="mv-answer">
						<div class="mv-answer-head"><Icon name="correct" size={15} /><span>정답</span></div>
						<div class="mv-board sol"><MatchstickBoard board={parseEq(m.solution)} picked={null} onstick={() => {}} interactive={false} label={"정답 " + m.solution} /></div>
					</div>
				{:else}
					<button class="mv-reveal" onclick={() => (matchReveal[i] = true)}>정답 보기</button>
				{/if}
			</article>
		{/each}
	</div>
</section>

<a class="today-cta" href="/">
	<span><Icon name="arrow" size={15} /> 오늘의 딸깍 풀러 가기</span>
</a>

<style>
	.crumb {
		padding: 4px 0 6px;
	}
	.crumb a {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-label);
		color: var(--muted);
		text-decoration: none;
	}
	.crumb a:hover {
		color: var(--accent);
	}
	h1 {
		font-size: var(--fs-xl);
		font-weight: var(--fw-number);
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		margin-bottom: 22px;
	}
	.grp {
		margin-bottom: 30px;
	}
	.mid-ad {
		margin: 6px 0 30px;
	}
	.grp-h {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 12px;
	}
	.grp-h h2 {
		font-size: var(--fs-md);
		font-weight: var(--fw-emphasis);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 12px;
		align-items: start;
	}
	.mv {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}
	.mv-board {
		max-width: 200px;
	}
	.mv-board :global(svg) {
		height: 72px;
		width: auto;
	}
	.mv-cap {
		font-size: var(--fs-2xs);
		font-weight: var(--fw-caption);
		color: var(--muted);
	}
	.mv-reveal {
		font-family: inherit;
		font-size: var(--fs-xs);
		font-weight: var(--fw-emphasis);
		color: var(--muted);
		background: var(--panel-2);
		border: 1.5px solid var(--border-strong);
		border-bottom-width: 3px;
		border-radius: 12px;
		padding: 9px 18px;
		cursor: pointer;
	}
	.mv-reveal:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.mv-reveal:active {
		border-bottom-width: 1px;
	}
	.mv-answer {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
	}
	.mv-answer-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: var(--fs-2xs);
		font-weight: var(--fw-emphasis);
		color: #1f6b41;
	}
	.today-cta {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 13px 20px;
		border-radius: 14px;
		background: var(--accent-soft);
		border: 1px solid #cfe6d8;
		text-decoration: none;
		font-size: var(--fs-sm);
		font-weight: var(--fw-emphasis);
		color: #1f6b41;
	}
	.today-cta:hover {
		border-color: var(--accent);
	}
</style>
