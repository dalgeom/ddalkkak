<script lang="ts">
	import ProblemView from '$lib/components/ProblemView.svelte';
	import MatchstickBoard from '$lib/components/MatchstickBoard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import { parseEq } from '$lib/matchstick';
	import type { Problem } from '$lib/problems';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// 성냥개비는 문제(displayed) → 정답(solution)을 각각 읽기 전용 보드로 보여준다.
	let matchReveal = $state<boolean[]>([]);
	let bonusReveal = $state(false);
	$effect(() => {
		matchReveal = data.match.map(() => false);
		bonusReveal = false;
	});

	/* 검색엔진용 Quiz 구조화 데이터 — 이 페이지가 문제·정답 플래시카드형 Q&A임을 알린다 */
	const strip = (s: string) => s.replace(/<[^>]*>/g, '').trim();
	const qtext = (blocks: Problem['blocks']) =>
		blocks
			.map((b) => (b.kind === 'text' ? strip(b.html) : b.kind === 'pre' ? b.text : ''))
			.filter(Boolean)
			.join(' · ');
	let quizLd = $derived.by(() => {
		const qs: { q: string; a: string }[] = [];
		const push = (p: Problem) => {
			const a = p.answers?.[0] ?? p.choices?.[p.answerIndex ?? -1];
			if (a) qs.push({ q: qtext(p.blocks), a: String(a) });
		};
		data.discover.forEach(push);
		data.trivia.forEach(push);
		for (const m of data.match)
			qs.push({ q: `성냥개비 퍼즐: ${m.displayed} 에서 성냥 하나만 옮겨 참인 식으로 만들기`, a: m.solution });
		if (data.bonus) {
			if (data.bonus.kind === 'match')
				qs.push({
					q: `성냥개비 퍼즐: ${data.bonus.eq.displayed} 에서 성냥 하나만 옮겨 참인 식으로 만들기`,
					a: data.bonus.eq.solution
				});
			else push(data.bonus.problem);
		}
		const ld = {
			'@context': 'https://schema.org',
			'@type': 'Quiz',
			name: `${data.label} 오늘의 딸깍 10문제`,
			inLanguage: 'ko',
			about: { '@type': 'Thing', name: '두뇌 퍼즐·상식 퀴즈' },
			hasPart: qs.map(({ q, a }) => ({
				'@type': 'Question',
				eduQuestionType: 'Flashcard',
				text: q,
				acceptedAnswer: { '@type': 'Answer', text: a }
			}))
		};
		// '<'를 이스케이프해 스크립트 태그 조기 종료를 막는다
		return JSON.stringify(ld).replace(/</g, '\\u003c');
	});
</script>

<svelte:head>
	<title>{data.label} 오늘의 딸깍 — 지난 문제</title>
	<meta
		name="description"
		content="{data.label}의 오늘의 딸깍 10문제. 발견형 퍼즐 3 · 상식 퀴즈 3 · 성냥개비 3 + 보너스 1의 문제와 정답·해설을 확인하세요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/archive/{data.day}" />
	<meta property="og:title" content="{data.label} 오늘의 딸깍 — 지난 문제" />
	<meta
		property="og:description"
		content="{data.label}의 10문제와 정답·해설. 발견형 3 · 상식 3 · 성냥개비 3 + 보너스 1."
	/>
	<meta property="og:url" content="https://ddalkkak.app/archive/{data.day}" />
	{@html `<script type="application/ld+json">${quizLd}</` + `script>`}
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

{#if data.bonus}
	<section class="grp">
		<div class="grp-h"><Icon name="hint" size={16} /><h2>보너스 문제</h2></div>
		<div class="grid">
			{#if data.bonus.kind === 'match'}
				<article class="mv">
					<div class="mv-board"><MatchstickBoard board={parseEq(data.bonus.eq.displayed)} picked={null} onstick={() => {}} interactive={false} label={data.bonus.eq.displayed} /></div>
					<div class="mv-cap">성냥 하나만 옮겨 참으로</div>
					{#if bonusReveal}
						<div class="mv-answer">
							<div class="mv-answer-head"><Icon name="correct" size={15} /><span>정답</span></div>
							<div class="mv-board sol"><MatchstickBoard board={parseEq(data.bonus.eq.solution)} picked={null} onstick={() => {}} interactive={false} label={"정답 " + data.bonus.eq.solution} /></div>
						</div>
					{:else}
						<button class="mv-reveal" onclick={() => (bonusReveal = true)}>정답 보기</button>
					{/if}
				</article>
			{:else}
				<ProblemView problem={data.bonus.problem} />
			{/if}
		</div>
	</section>
{/if}

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
		margin: 0;
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
