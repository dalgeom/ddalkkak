<script lang="ts">
	import { track } from '$lib/analytics';
	import { MATCH_ANSWERS, answerSlug, cellsOf, mainRule } from '$lib/matchAnswers';
	import { RULE_LABEL, pretty, solve } from '$lib/matchSolve';

	// 자주 찾는 성냥 식 정답 모음(2026-10-29) — 식마다 쪽으로 잇는다(matchAnswers.ts 머리 주석)
	const LIST = MATCH_ANSWERS.map((a) => {
		const rule = mainRule(a.q);
		return { q: a.q, rule, answers: solve(cellsOf(a.q), rule).map((s) => s.text) };
	});
	// 답이 숨는 자리 세 갈래(2026-11-27) — 식은 LIST에서 뽑아 목록과 어긋나지 않게 한다
	const pick = (qs: string[]) => LIST.filter((e) => qs.includes(e.q));
	const SIGN = pick(['8-2=8', '9+1=0', '6-6=8', '9-6=8']);
	const TWO = pick(['10+3=18', '9-9=5', '9+5=9', '8+9=10', '1+8=7']);
	const MOVE2 = LIST.filter((e) => e.rule === 'move2');
	const BOTH = SIGN.filter((e) => e.rule === 'move2');
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

	{#snippet eqs(list: typeof LIST)}
		<p class="eqs">
			{#each list as e (e.q)}<a href="/matchstick/answer/{answerSlug(e.q)}">{pretty(e.q)}</a>{/each}
		</p>
	{/snippet}

	<section class="sec guide">
		<h2>이 {LIST.length}개 식에서 답이 숨는 자리</h2>
		<p>
			많이 찾는 식을 모아 보면 막히는 자리가 몇 군데로 모여요. 숫자만 들여다보다 시간이 가는 경우가 많은데, 아래 세
			갈래 중 어디에 드는지 먼저 짚으면 답이 훨씬 빨리 보여요.
		</p>
		<h3>기호가 바뀌는 식</h3>
		{@render eqs(SIGN)}
		<p>
			빼기 기호에 세로 성냥 하나를 꽂으면 더하기가 되고, 더하기에서 세로 성냥을 뽑으면 빼기가 돼요. 숫자를 아무리
			바꿔도 식이 맞지 않으면 숫자가 아니라 기호부터 의심해 보세요.
		</p>
		<h3>성냥 하나로 두 숫자가 함께 바뀌는 식</h3>
		{@render eqs(TWO)}
		<p>
			한 숫자에서 성냥을 뽑아 다른 숫자에 꽂으면 숫자 두 개가 한꺼번에 바뀌어요. 한 획 차이 숫자표에서 「하나 빼면
			되는 숫자」와 「하나 더하면 되는 숫자」를 짝지어 보면 옮길 자리가 보여요.
		</p>
		<h3>1개 옮기기로는 답이 없는 식</h3>
		{@render eqs(MOVE2)}
		<p>
			하나를 옮기는 길을 다 해 봤는데 막혔다면 실수가 아니라 두 개를 옮겨야 하는 문제예요. 이때는 성냥 두 개를 한
			자리에서 함께 옮기거나, 두 자리에서 하나씩 옮기는 길을 찾아보세요.{#if BOTH.length}
				기호 갈래의 {BOTH.map((e) => pretty(e.q)).join(' · ')}도 여기에 들어요.{/if}
		</p>
		<p>
			<a href="/matchstick/guide">성냥개비 문제 푸는 법</a>의 한 획 차이 숫자표를 옆에 두고 기호 → 두 숫자 → 두 개 순서로
			살펴보면 처음 보는 식도 풀 수 있어요.
		</p>
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
	.guide h2 {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 8px;
		word-break: keep-all;
	}
	.guide h3 {
		font-size: 15px;
		font-weight: 800;
		margin: 18px 0 6px;
		word-break: keep-all;
	}
	.guide p {
		margin: 0 0 10px;
		font-size: 14px;
		line-height: 1.8;
		color: var(--muted);
		word-break: keep-all;
	}
	.guide a {
		color: var(--accent-text);
		font-weight: 700;
	}
	.eqs {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		font-variant-numeric: tabular-nums;
	}
	.eqs a {
		white-space: nowrap;
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
