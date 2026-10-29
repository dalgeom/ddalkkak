<script lang="ts">
	import { track } from '$lib/analytics';
	import MatchEquation from '$lib/components/MatchEquation.svelte';
	import { MATCH_ANSWERS, answerSlug, cellsOf, mainRule } from '$lib/matchAnswers';
	import { RULES, RULE_LABEL, changeLine, pretty, solve } from '$lib/matchSolve';

	/*
	 * 자주 찾는 성냥 식 하나의 정답(2026-10-29). 검색에서 바로 이 식으로 들어온 사람이 답 그림과 풀이를 보고,
	 * 다른 규칙의 답 · 다른 식 · 우리 문제로 넘어간다. 답은 풀이기로 만든다(matchAnswers.ts 머리 주석).
	 */
	let { data } = $props();

	const cells = $derived(cellsOf(data.q));
	const rule = $derived(mainRule(data.q));
	const answers = $derived(solve(cells, rule));
	const others = $derived(RULES.filter((r) => r !== rule).map((r) => ({ rule: r, list: solve(cells, r).map((s) => s.text) })));
	const more = $derived(MATCH_ANSWERS.filter((a) => a.q !== data.q));
	const url = $derived(`https://ddalkkak.app/matchstick/answer/${answerSlug(data.q)}`);
	const head = $derived(`${pretty(data.q)} 성냥개비 ${RULE_LABEL[rule]} 정답`);
	const ansText = $derived(answers.map((s) => pretty(s.text)).join(', '));
</script>

<svelte:head>
	<title>{head} — {ansText} | 딸깍 퍼즐</title>
	<meta name="description" content="{pretty(data.q)} 성냥개비 문제, 성냥 {RULE_LABEL[rule]} 정답은 {ansText}. 어느 성냥을 어디로 옮기는지 그림과 풀이로 보여 드려요." />
	<link rel="canonical" href={url} />
	<meta property="og:title" content="{head} | 딸깍 퍼즐" />
	<meta property="og:description" content="답은 {ansText}. 어느 성냥을 옮기는지 그림으로 보여 드려요." />
	<meta property="og:url" content={url} />
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/matchstick">성냥개비</a><span aria-hidden="true">›</span><a href="/matchstick/answer">정답 모음</a><span
				aria-hidden="true">›</span
			><span>{pretty(data.q)}</span>
		</nav>
		<h1>{pretty(data.q)}<br /><b>성냥 {RULE_LABEL[rule]} 정답</b></h1>
		<p class="lead">답은 <b>{ansText}</b>예요.</p>
	</header>

	<section class="sec">
		<h2 class="sh">문제</h2>
		<div class="ans">
			<MatchEquation {cells} label={'문제 ' + pretty(data.q)} />
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">정답 {answers.length > 1 ? answers.length + '개' : ''}</h2>
		<p class="sub">주황 성냥은 새로 놓은 성냥, 주황 점선은 성냥을 뺀 자리예요.</p>
		<div class="answers">
			{#each answers as s (s.text)}
				<div class="ans">
					<MatchEquation cells={s.cells} added={s.added} removed={s.removed} label={'답 ' + pretty(s.text)} />
					<p class="at">{pretty(s.text)}</p>
					<p class="ch">{changeLine(cells, s.cells)}</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">풀이</h2>
		<p class="mp">{data.note}</p>
	</section>

	<section class="sec">
		<h2 class="sh">규칙이 다르다면</h2>
		<p class="sub">문제에 적힌 말을 보고 골라요. 「하나만 움직여서」는 1개 옮기기예요.</p>
		<div class="exs">
			{#each others as o (o.rule)}
				<a class="ex" href="/matchstick/solve?q={encodeURIComponent(data.q)}&r={o.rule}" onclick={() => track('manswer_rule')}>
					<span class="eq-q">성냥 {RULE_LABEL[o.rule]}</span>
					<span class="eq-r">{o.list.length ? o.list.length + '개' : ''}</span>
					<span class="eq-a" class:none={!o.list.length}>{o.list.length ? o.list.map(pretty).join(', ') : '답이 없어요'}</span>
				</a>
			{/each}
		</div>
	</section>

	<section class="sec">
		<a class="cta main" href="/matchstick" onclick={() => track('manswer_play')}>
			성냥개비 문제 직접 풀어 보기 <span aria-hidden="true">→</span>
		</a>
		<a class="cta" href="/matchstick/solve" onclick={() => track('manswer_solve')}>
			다른 식 넣어서 정답 찾기 <span aria-hidden="true">→</span>
		</a>
	</section>

	<section class="sec">
		<h2 class="sh">다른 식 정답</h2>
		<div class="exs">
			{#each more as a (a.q)}
				<a class="ex" href="/matchstick/answer/{answerSlug(a.q)}">
					<span class="eq-q">{pretty(a.q)}</span>
					<span class="eq-r">성냥 {RULE_LABEL[mainRule(a.q)]}</span>
				</a>
			{/each}
		</div>
	</section>
</article>

<style>
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 6px 2px;
		word-break: keep-all;
	}
	.sub {
		margin: 0 0 12px 2px;
		font-size: 13px;
		color: var(--muted);
		line-height: 1.65;
		word-break: keep-all;
	}
	.answers {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.ans {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 12px;
	}
	.at {
		margin: 10px 0 2px;
		text-align: center;
		font-size: 19px;
		font-weight: 800;
		color: var(--accent-text);
		font-variant-numeric: tabular-nums;
	}
	.ch {
		margin: 0;
		text-align: center;
		font-size: 13px;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.mp {
		margin: 0 2px;
		font-size: 15px;
		line-height: 1.8;
		color: var(--text);
		word-break: keep-all;
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
	.cta + .cta {
		margin-top: 8px;
	}
	.cta:hover {
		background: var(--panel-2);
	}
	.cta.main {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
		font-weight: 800;
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
	.eq-a.none {
		color: var(--muted);
		font-weight: 600;
	}
</style>
