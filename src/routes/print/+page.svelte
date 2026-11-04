<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { track } from '$lib/analytics';
	import MatchEquation from '$lib/components/MatchEquation.svelte';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import PrintSheet from '$lib/components/PrintSheet.svelte';
	import { CHOSUNG_CATEGORIES } from '$lib/data/chosung';
	import { CHOSUNG_WORDS, chosungOf, chosungOfDay, type ChosungWord } from '$lib/chosung';
	import { CHOSUNG_TIERS } from '$lib/chosungTiers';
	import { kstDayNumber } from '$lib/game';
	import { MAKE_RULES, makeProblems, type Made, type MakeRule } from '$lib/matchMake';
	import { RULE_LABEL, parseCells, pretty } from '$lib/matchSolve';

	/*
	 * 학습지 만들기(2026-11-04) — 초성 퀴즈 · 성냥개비 문제를 A4 한 장으로 뽑고, 둘째 장에 답을 싣는다.
	 * 왜: 띄우기(/chosung/show · /trivia/show)는 화면이 있는 교실용이다. 화면이 없는 곳(돌봄 교실 · 복지관 · 숙제)에는
	 * 종이가 필요하다. 초성은 오늘의 초성을 빼고 뽑고, 성냥은 맞는 식을 무작위로 만들어 답이 하나뿐인 문제만 고른다.
	 * 계측: print_make(종류 · 설정) · print_go(인쇄 버튼)
	 */

	type Kind = 'cho' | 'match';
	type MatchItem = { key: string; rule: MakeRule; m: Made };

	const CHO_SIZES = [10, 20, 30] as const;
	const MATCH_SIZES = [6, 10, 12] as const;

	let kind = $state<Kind>('cho');
	let cat = $state('all');
	let easy = $state(false);
	let choSize = $state<number>(20);
	let rule = $state<MakeRule | 'mix'>('move1');
	let matchSize = $state<number>(10);
	let cho = $state<ChosungWord[]>([]);
	let match = $state<MatchItem[]>([]);

	const catName = (slug: string) => CHOSUNG_CATEGORIES.find((c) => c.slug === slug)?.name ?? '';
	const tierOf = (w: ChosungWord) => CHOSUNG_TIERS[w.word] ?? 3;
	const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

	function shuffle<T>(a: T[]): T[] {
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function makeCho(): ChosungWord[] {
		// 오늘의 초성은 뺀다 — 학습지로 먼저 보면 그날 혼자 푸는 재미가 샌다
		const today = CHOSUNG_WORDS[chosungOfDay(kstDayNumber(Date.now()))]?.word;
		let pool = CHOSUNG_WORDS.filter((w) => (cat === 'all' || w.category === cat) && w.word !== today);
		if (easy) {
			const e = pool.filter((w) => tierOf(w) <= 2);
			if (e.length >= Math.min(choSize, 10)) pool = e;
		}
		// 같은 장에 초성이 같은 낱말 둘이 나오면 답이 헷갈린다 — 하나만 남긴다
		const seen = new Set<string>();
		return shuffle([...pool])
			.filter((w) => {
				const k = w.category + chosungOf(w.word);
				if (seen.has(k)) return false;
				seen.add(k);
				return true;
			})
			.slice(0, choSize)
			.sort((a, b) => tierOf(a) - tierOf(b));
	}

	/** 맞는 한 자리 식(5+3=8 · 9-4=5)을 무작위로 만들고, 거기서 답이 하나뿐인 문제를 하나씩 뽑는다 */
	function makeMatch(): MatchItem[] {
		const out: MatchItem[] = [];
		const used = new Set<string>();
		for (let tries = 0; out.length < matchSize && tries < 400; tries++) {
			const r = rule === 'mix' ? pick(MAKE_RULES) : rule;
			const a = Math.floor(Math.random() * 10);
			const b = Math.floor(Math.random() * 10);
			const plus = Math.random() < 0.5;
			const c = plus ? a + b : a - b;
			if (c < 0) continue;
			const src = `${a}${plus ? '+' : '-'}${b}=${c}`;
			if (used.has(src)) continue;
			const p = parseCells(src);
			if ('error' in p) continue;
			const ones = makeProblems(p.cells, r).filter((m) => m.answers.length === 1 && !used.has(m.text));
			if (!ones.length) continue;
			const m = pick(ones);
			used.add(src);
			used.add(m.text);
			out.push({ key: `${r}:${m.text}`, rule: r, m });
		}
		return out;
	}

	function make(from: 'auto' | 'button' = 'button') {
		if (kind === 'cho') cho = makeCho();
		else match = makeMatch();
		if (from === 'button') track('print_make', kind === 'cho' ? { kind, cat, size: choSize, easy } : { kind, rule, size: matchSize });
	}

	function go() {
		track('print_go', { kind, n: kind === 'cho' ? cho.length : match.length });
		window.print();
	}

	function setKind(k: Kind) {
		kind = k;
		if (k === 'cho' ? !cho.length : !match.length) make('auto');
	}

	onMount(() => {
		const t = page.url.searchParams.get('t');
		if (t === 'match') kind = 'match';
		make('auto');
	});

	const n = $derived(kind === 'cho' ? cho.length : match.length);
	const title = $derived(
		kind === 'cho' ? `초성 퀴즈${cat === 'all' ? '' : ' — ' + catName(cat)}` : `성냥개비 문제${rule === 'mix' ? '' : ' — 성냥 ' + RULE_LABEL[rule]}`
	);

	const ld = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: '딸깍 학습지 만들기',
		url: 'https://ddalkkak.app/print',
		applicationCategory: 'EducationalApplication',
		operatingSystem: 'Web',
		inLanguage: 'ko',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
		description:
			'초성 퀴즈와 성냥개비 문제를 A4 학습지로 만들어 인쇄하는 무료 도구. 분야 · 난이도 · 문제 수를 고르면 문제 장과 답 장이 함께 나온다.'
	});
</script>

<svelte:head>
	<title>초성 퀴즈 · 성냥개비 문제 학습지 만들기 — A4로 인쇄, 답지 포함 | 딸깍</title>
	<meta
		name="description"
		content="초성 퀴즈 {CHOSUNG_WORDS.length}낱말과 성냥개비 문제를 A4 학습지로 바로 인쇄해요. 분야 · 난이도 · 문제 수를 고르면 둘째 장에 답이 붙어요. 돌봄 교실 · 복지관 · 숙제용, 무료."
	/>
	<link rel="canonical" href="https://ddalkkak.app/print" />
	<meta property="og:title" content="초성 퀴즈 · 성냥개비 문제 학습지 만들기 | 딸깍" />
	<meta property="og:url" content="https://ddalkkak.app/print" />
	{@html `<script type="application/ld+json">${ld}</` + `script>`}
</svelte:head>

{#snippet sheet(withAnswers: boolean)}
	<h1 class="p-h">{title}</h1>
	<p class="p-n">
		이름 ________________ ·
		{kind === 'cho' ? '힌트를 보고 초성에 맞는 낱말을 쓰세요.' : '성냥을 규칙대로 움직여 맞는 식을 만드세요.'}
	</p>
	{#if kind === 'cho'}
		<ol class="p-list cho">
			{#each cho as w, i (w.word)}
				<li class="p-i">
					<span class="p-q">{i + 1}. <small>{catName(w.category)}</small> {w.hint}</span>
					<span class="p-cho">{chosungOf(w.word)}</span>
					<span class="p-line">답 ______________</span>
				</li>
			{/each}
		</ol>
	{:else}
		<ol class="p-list">
			{#each match as t, i (t.key)}
				<li class="p-i">
					<span class="p-q">{i + 1}. 성냥 {RULE_LABEL[t.rule]}</span>
					<MatchEquation cells={t.m.cells} label={pretty(t.m.text)} />
				</li>
			{/each}
		</ol>
	{/if}
	<p class="p-f">ddalkkak.app/print 에서 만들었어요</p>
	{#if withAnswers}
		<div class="p-break"></div>
		<h1 class="p-h">답 — {title}</h1>
		{#if kind === 'cho'}
			<ol class="p-ans">
				{#each cho as w, i (w.word)}
					<li>{i + 1}. {chosungOf(w.word)} → <b>{w.word}</b></li>
				{/each}
			</ol>
		{:else}
			<ol class="p-list">
				{#each match as t, i (t.key)}
					<li class="p-i">
						<span class="p-q">{i + 1}. {pretty(t.m.text)} → <b>{pretty(t.m.mine.text)}</b></span>
						<MatchEquation
							cells={t.m.mine.cells}
							added={t.m.mine.added}
							removed={t.m.mine.removed}
							label={'답 ' + pretty(t.m.mine.text)}
						/>
					</li>
				{/each}
			</ol>
		{/if}
	{/if}
{/snippet}

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/tools">도구 모음</a><span aria-hidden="true">›</span><span>학습지 만들기</span>
		</nav>
		<h1>초성 · 성냥 문제를<br /><b>A4 학습지로</b></h1>
		<p class="lead">
			고르고 누르면 문제 한 장, 답 한 장이 나와요. 화면이 없는 교실 · 복지관 · 숙제에 그대로 인쇄해 쓰세요. 누를 때마다 새 문제로
			섞여요.
		</p>
	</header>

	<section class="setup" aria-label="학습지 설정">
		<h2 class="sh">종류</h2>
		<div class="chips" role="radiogroup" aria-label="종류">
			<button role="radio" aria-checked={kind === 'cho'} class:on={kind === 'cho'} onclick={() => setKind('cho')}>초성 퀴즈</button>
			<button role="radio" aria-checked={kind === 'match'} class:on={kind === 'match'} onclick={() => setKind('match')}>성냥개비 문제</button>
		</div>

		{#if kind === 'cho'}
			<h2 class="sh">분야</h2>
			<div class="chips" role="radiogroup" aria-label="분야">
				<button role="radio" aria-checked={cat === 'all'} class:on={cat === 'all'} onclick={() => (cat = 'all')}>섞어서</button>
				{#each CHOSUNG_CATEGORIES as c (c.slug)}
					<button role="radio" aria-checked={cat === c.slug} class:on={cat === c.slug} onclick={() => (cat = c.slug)}>{c.name}</button>
				{/each}
			</div>
			<h2 class="sh">난이도</h2>
			<div class="chips" role="radiogroup" aria-label="난이도">
				<button role="radio" aria-checked={!easy} class:on={!easy} onclick={() => (easy = false)}>골고루</button>
				<button role="radio" aria-checked={easy} class:on={easy} onclick={() => (easy = true)}>쉬운 낱말 위주</button>
			</div>
			<h2 class="sh">문제 수</h2>
			<div class="chips" role="radiogroup" aria-label="문제 수">
				{#each CHO_SIZES as s (s)}
					<button role="radio" aria-checked={choSize === s} class:on={choSize === s} onclick={() => (choSize = s)}>{s}문제</button>
				{/each}
			</div>
		{:else}
			<h2 class="sh">규칙</h2>
			<div class="chips" role="radiogroup" aria-label="규칙">
				{#each MAKE_RULES as r (r)}
					<button role="radio" aria-checked={rule === r} class:on={rule === r} onclick={() => (rule = r)}>{RULE_LABEL[r]}</button>
				{/each}
				<button role="radio" aria-checked={rule === 'mix'} class:on={rule === 'mix'} onclick={() => (rule = 'mix')}>섞어서</button>
			</div>
			<h2 class="sh">문제 수</h2>
			<div class="chips" role="radiogroup" aria-label="문제 수">
				{#each MATCH_SIZES as s (s)}
					<button role="radio" aria-checked={matchSize === s} class:on={matchSize === s} onclick={() => (matchSize = s)}>{s}문제</button>
				{/each}
			</div>
		{/if}

		<button class="cta ghost" onclick={() => make()}>이 설정으로 새로 섞기</button>
		<button class="cta" onclick={go} disabled={!n}>인쇄하기 · 답지 포함 {n}문제 <span aria-hidden="true">→</span></button>
		<p class="sub">
			인쇄 창에서 「PDF로 저장」을 고르면 파일로도 받을 수 있어요. {kind === 'cho'
				? '오늘의 초성 낱말은 빼고 뽑아요.'
				: '답이 하나뿐인 문제만 골라요.'}
		</p>
	</section>

	<section class="sec" aria-label="미리 보기">
		<h2 class="sh">미리 보기 <small>첫째 장 · 둘째 장은 답</small></h2>
		<div class="paper">{@render sheet(false)}</div>
	</section>

	<section class="sec">
		<h2 class="sh">초성 학습지 쓰는 법</h2>
		<p class="deep">
			낱말마다 <b>분야 · 힌트 · 초성</b>이 함께 나와요. 초성만 주면 정답이 여러 개 떠올라 채점이 어려운데, 힌트가 하나로 좁혀
			줘요. 한 장 안에서는 같은 분야에 초성이 똑같은 낱말이 둘 나오지 않게 골랐고, 쉬운 낱말부터 차례로 놓아서 첫 줄에서 막히는
			일이 적어요. 어린이나 어르신 모임이라면 <b>쉬운 낱말 위주</b>를 고르세요.
		</p>
		<p class="deep">
			사자성어 분야는 국어 시간 복습으로, 나라 이름은 사회 시간 지도와 엮어 쓰기 좋아요. 같은 낱말로 다 같이 맞히는 진행이
			필요하면 <a class="inl" href="/chosung/show">초성 퀴즈 띄우기</a>로 TV에 크게 띄울 수 있어요.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">성냥 학습지 쓰는 법</h2>
		<p class="deep">
			매번 맞는 식을 새로 만들고, 거기서 성냥 하나를 옮기거나 빼거나 더한 <b>틀린 식</b>을 문제로 내요. 그중 <b>답이 하나뿐인
			문제</b>만 골라서 채점할 때 「이것도 되지 않나요?」가 나오지 않아요. 답 장에는 어느 성냥을 옮겼는지 색으로 표시돼요.
		</p>
		<p class="deep">
			처음이라면 <b>옮기기</b>부터, 익숙해지면 <b>섞어서</b>를 고르세요. 특정 식으로 문제를 내고 싶다면
			<a class="inl" href="/matchstick/make">성냥 문제 만들기</a>에서 식을 직접 넣어 만든 뒤 인쇄할 수 있고, 받은 문제의 답이 궁금하면
			<a class="inl" href="/matchstick/solve">정답 찾기</a>에 넣어 보세요.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">인쇄할 때</h2>
		<p class="deep">
			용지는 A4, 여백은 기본으로 두면 돼요. 헤더 · 메뉴 · 광고는 종이에 나오지 않고 문제와 답만 찍혀요. 성냥 그림은 잉크를 덜 쓰게
			흰 바탕에 검은 성냥으로 바뀌어요. 문제 장만 나눠 주려면 인쇄 창에서 「페이지: 1」만 고르세요. 다른 도구는
			<a class="inl" href="/tools">도구 모음</a>에 있어요.
		</p>
	</section>

	<OtherGames />
</article>

{#if n}
	<PrintSheet>{@render sheet(true)}</PrintSheet>
{/if}

<style>
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 8px 2px;
		word-break: keep-all;
	}
	.sh small {
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
		margin-left: 4px;
	}
	.sub {
		margin: 10px 2px 0;
		font-size: 13px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.setup {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 18px 16px;
		margin: 20px 0 24px;
	}
	.setup .sh:not(:first-child) {
		margin-top: 16px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chips button {
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		background: var(--bg, transparent);
		border: 1px solid var(--border-strong);
		border-radius: 10px;
		padding: 8px 12px;
		min-height: 40px;
		cursor: pointer;
	}
	.chips button.on {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}
	.cta {
		margin-top: 18px;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 54px;
		border: 0;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font: inherit;
		font-size: 15.5px;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.cta.ghost {
		background: transparent;
		color: var(--text);
		border: 1px solid var(--border-strong);
		box-shadow: none;
		min-height: 48px;
	}
	.cta.ghost + .cta {
		margin-top: 10px;
	}
	.cta:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.sec {
		margin-bottom: 24px;
	}
	.deep {
		margin-top: 10px;
		font-size: 14px;
		line-height: 1.85;
		color: var(--muted);
		word-break: keep-all;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 15px 16px;
	}
	.deep b {
		color: var(--text);
	}

	/* 미리 보기 — 종이처럼 흰 바탕 */
	.paper {
		background: #fff;
		color: #111;
		border: 1px solid var(--border-strong);
		border-radius: 6px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
		padding: 18px 14px;
		overflow: hidden;
	}

	/* 학습지 — 미리 보기와 인쇄가 같은 틀을 쓴다 */
	.p-h {
		font-size: 18pt;
		margin: 0 0 4pt;
		word-break: keep-all;
	}
	.p-n,
	.p-f {
		margin: 0 0 10pt;
		font-size: 10pt;
		color: #444;
		word-break: keep-all;
	}
	.p-f {
		margin-top: 12pt;
	}
	.p-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10pt 14pt;
	}
	.p-i {
		break-inside: avoid;
		min-width: 0;
	}
	.p-q {
		display: block;
		margin-bottom: 3pt;
		font-size: 10.5pt;
		line-height: 1.5;
		word-break: keep-all;
	}
	.p-q small {
		font-size: 8.5pt;
		color: #666;
		border: 1px solid #bbb;
		border-radius: 3pt;
		padding: 0 3pt;
	}
	.p-cho {
		display: block;
		font-size: 20pt;
		font-weight: 800;
		letter-spacing: 3pt;
		margin: 2pt 0;
	}
	.p-line {
		display: block;
		font-size: 10pt;
		color: #555;
	}
	.cho {
		gap: 12pt 14pt;
	}
	.p-ans {
		list-style: none;
		margin: 0;
		padding: 0;
		columns: 3;
		column-gap: 14pt;
		font-size: 11pt;
		line-height: 2;
	}
	.p-ans li {
		break-inside: avoid;
	}
	.p-break {
		break-after: page;
	}
	@media (max-width: 360px) {
		.paper {
			padding: 14px 10px;
		}
		.p-list {
			gap: 10pt 8pt;
		}
	}
</style>
