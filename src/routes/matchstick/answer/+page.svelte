<script lang="ts">
	import { track } from '$lib/analytics';
	import { MATCH_ANSWERS, answerSlug, cellsOf, mainRule } from '$lib/matchAnswers';
	import { RULE_LABEL, pretty, solve } from '$lib/matchSolve';

	// 자주 찾는 성냥 식 정답 모음(2026-10-29) — 식마다 쪽으로 잇는다(matchAnswers.ts 머리 주석)
	const LIST = MATCH_ANSWERS.map((a) => {
		const rule = mainRule(a.q);
		return { q: a.q, rule, answers: solve(cellsOf(a.q), rule).map((s) => s.text) };
	});
</script>

<svelte:head>
	<title>자주 찾는 성냥개비 문제 정답 모음 — 12−7=6, 8−2=8, 9+1=0 | 딸깍 퍼즐</title>
	<meta
		name="description"
		content="검색으로 많이 찾는 성냥개비 문제 {LIST.length}개의 정답과 풀이. 12−7=6, 10+3=18, 8−2=8, 9−9=5처럼 성냥 한 개 또는 두 개를 옮기는 문제를 그림으로 풀어 드려요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/matchstick/answer" />
	<meta property="og:title" content="자주 찾는 성냥개비 문제 정답 모음 | 딸깍 퍼즐" />
	<meta property="og:description" content="많이 찾는 성냥 식의 정답을 그림과 풀이로 보여 드려요." />
	<meta property="og:url" content="https://ddalkkak.app/matchstick/answer" />
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/matchstick">성냥개비</a><span aria-hidden="true">›</span><span>정답 모음</span>
		</nav>
		<h1>자주 찾는 성냥개비 문제<br /><b>정답 모음</b></h1>
		<p class="lead">
			검색으로 많이 찾아 들어오는 식 {LIST.length}개예요. 누르면 어느 성냥을 어디로 옮기는지 그림과 풀이로 보여
			드려요. 여기 없는 식은 <a href="/matchstick/solve">정답 찾기</a>에 넣으면 바로 풀어요.
		</p>
	</header>

	<section class="sec">
		<div class="exs">
			{#each LIST as e (e.q)}
				<a class="ex" href="/matchstick/answer/{answerSlug(e.q)}">
					<span class="eq-q">{pretty(e.q)}</span>
					<span class="eq-r">성냥 {RULE_LABEL[e.rule]}</span>
					<span class="eq-a">{e.answers.map(pretty).join(', ')}</span>
				</a>
			{/each}
		</div>
	</section>

	<section class="sec">
		<a class="cta" href="/matchstick" onclick={() => track('manswer_play')}>
			성냥개비 문제 직접 풀어 보기 <span aria-hidden="true">→</span>
		</a>
	</section>
</article>

<style>
	.lead a {
		color: var(--accent-text);
		font-weight: 700;
	}
	.exs {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.ex {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-areas: 'q r' 'a a';
		align-items: baseline;
		gap: 3px 10px;
		padding: 12px 14px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		text-decoration: none;
		color: var(--text);
	}
	.ex:hover {
		background: var(--panel-2);
	}
	.eq-q {
		grid-area: q;
		font-size: 15.5px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.eq-r {
		grid-area: r;
		justify-self: end;
		font-size: 12px;
		font-weight: 700;
		color: var(--muted-2);
		white-space: nowrap;
	}
	.eq-a {
		grid-area: a;
		font-size: 13.5px;
		color: var(--accent-text);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		word-break: keep-all;
	}
	.eq-a::before {
		content: '답 ';
		color: var(--muted);
		font-weight: 600;
	}
	.cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 52px;
		border-radius: 14px;
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border-strong);
		font-size: 15px;
		font-weight: 700;
		text-decoration: none;
	}
	.cta:hover {
		background: var(--panel-2);
	}
</style>
