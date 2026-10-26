<script lang="ts">
	import { onMount } from 'svelte';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { track } from '$lib/analytics';
	import { kstDayNumber } from '$lib/game';
	import { CHOSUNG_WORDS, chosungOf, chosungOfDay, categoryBySlug, type ChosungWord } from '$lib/chosung';
	import { CHOSUNG_TIERS } from '$lib/chosungTiers';
	import OtherGames from '$lib/components/OtherGames.svelte';

	/**
	 * 초성 퀴즈 띄우기(2026-10-26) — 수업 · 모임에서 TV · 프로젝터에 크게 띄워 다 같이 맞히는 진행 화면.
	 * 왜: 네이버 검색으로 /chosung/{분야}에 온 사람의 4분의 3이 풀이로 가지 않고 대표 문제 · 정답 목록만 읽고 나갔다
	 * (10/12~25 127명 중 32명). 문제 자료를 찾는 진행자로 보고, 목록 대신 진행을 대신해 주는 도구를 둔다.
	 * 애드센스가 세 번 「가치가 별로 없는 콘텐츠」로 반려한 뒤 「도구 · 서비스」 쪽 가치를 세우는 첫 작업이기도 하다.
	 * 계측: chosung_show_start → chosung_show_end(끝 장면까지), chosung_show_full(전체 화면), 들어온 길 chosung_show_in_*.
	 */
	let { data } = $props();

	type Level = 'easy' | 'mix' | 'hard';
	const SIZES = [10, 20, 30] as const;
	const LEVELS: { key: Level; name: string; note: string }[] = [
		{ key: 'easy', name: '쉬움 위주', note: '어린이 · 어르신 모임' },
		{ key: 'mix', name: '골고루', note: '쉬운 것부터 어려운 것까지' },
		{ key: 'hard', name: '어려움 위주', note: '어른끼리 겨룰 때' }
	];

	let cat = $state('all');
	let size = $state<number>(10);
	let level = $state<Level>('mix');
	let deck = $state<ChosungWord[]>([]);
	let pos = $state(0);
	/** 0 초성만 · 1 힌트 · 2 정답 */
	let step = $state(0);
	let stage = $state<HTMLDivElement>();
	let canFull = $state(false);

	let presenting = $derived(!!page.state.show && deck.length > 0);
	let ended = $derived(pos >= deck.length);
	let cur = $derived(ended ? null : deck[pos]);
	let catName = $derived(cat === 'all' ? '전체' : (categoryBySlug(cat)?.name ?? ''));
	let total = $derived(data.cats.reduce((s, c) => s + c.count, 0));
	/** 같은 분야에서 초성이 똑같은 다른 낱말 — 진행자가 「이것도 정답」을 바로 판단하게 */
	let alsoOk = $derived.by(() => {
		if (!cur) return [];
		const cho = chosungOf(cur.word);
		const same = CHOSUNG_WORDS.filter((w) => w.category === cur.category && w.word !== cur.word && chosungOf(w.word) === cho).map((w) => w.word);
		return [...new Set([...same, ...cur.alts])];
	});

	const tierOf = (w: ChosungWord) => CHOSUNG_TIERS[w.word] ?? 3;

	function build(): ChosungWord[] {
		// 오늘의 초성은 뺀다 — 모임에서 먼저 보면 그날 혼자 푸는 재미가 샌다
		const today = CHOSUNG_WORDS[chosungOfDay(kstDayNumber(Date.now()))]?.word;
		let pool = CHOSUNG_WORDS.filter((w) => (cat === 'all' || w.category === cat) && w.word !== today);
		const leveled = pool.filter((w) => (level === 'easy' ? tierOf(w) <= 2 : level === 'hard' ? tierOf(w) >= 3 : true));
		if (leveled.length >= Math.min(size, 10)) pool = leveled;
		const shuffled = [...pool];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		// 뽑은 것 안에서는 쉬운 낱말부터 — 첫 문제에서 방이 얼어붙지 않게
		return shuffled.slice(0, size).sort((a, b) => tierOf(a) - tierOf(b));
	}

	function start() {
		deck = build();
		pos = 0;
		step = 0;
		pushState('', { show: true });
		track('chosung_show_start', { cat, size, level });
	}

	function again() {
		deck = build();
		pos = 0;
		step = 0;
		track('chosung_show_again');
	}

	function close() {
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		if (page.state.show) history.back();
	}

	function forward() {
		if (ended) return;
		if (step < 2) step++;
		else next();
	}
	function next() {
		if (ended) return;
		pos++;
		step = 0;
		if (pos >= deck.length) track('chosung_show_end', { size: deck.length });
	}
	function back() {
		if (step > 0 && !ended) step--;
		else if (pos > 0) {
			pos--;
			step = 2;
		}
	}

	function full() {
		if (!stage) return;
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		else {
			stage.requestFullscreen?.().catch(() => {});
			track('chosung_show_full');
		}
	}

	function onKey(e: KeyboardEvent) {
		if (!presenting || e.altKey || e.ctrlKey || e.metaKey) return;
		// 발표용 리모컨은 PageDown · PageUp을 보낸다
		if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
			e.preventDefault();
			forward();
		} else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
			e.preventDefault();
			back();
		} else if (e.key === 'h' || e.key === 'ㅗ') step = Math.max(step, 1);
		else if (e.key === 'f' || e.key === 'ㄹ') full();
	}

	// 진행 화면이 떠 있는 동안 뒤 화면이 스크롤되지 않게
	$effect(() => {
		document.documentElement.style.overflow = presenting ? 'hidden' : '';
		return () => (document.documentElement.style.overflow = '');
	});

	onMount(() => {
		canFull = !!document.documentElement.requestFullscreen;
		const c = page.url.searchParams.get('c');
		if (c && data.cats.some((x) => x.slug === c)) cat = c;
	});
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
	<title>초성 퀴즈 띄우기 — 수업 · 모임에서 화면에 크게 띄워 다 같이 맞히기 | 딸깍</title>
	<meta
		name="description"
		content="분야와 문제 수를 고르면 초성이 화면 가득 나와요. 힌트와 정답은 진행자가 한 번씩 눌러 넘기고, 같은 초성인 다른 낱말도 함께 보여 줘요. 동물 · 음식 · 과일·채소 · 나라 · 사자성어 {total}낱말."
	/>
	<link rel="canonical" href="https://ddalkkak.app/chosung/show" />
	<meta property="og:title" content="초성 퀴즈 띄우기 — 수업 · 모임에서 화면에 띄워 다 같이 | 딸깍" />
	<meta property="og:url" content="https://ddalkkak.app/chosung/show" />
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/chosung">초성 퀴즈</a><span aria-hidden="true">›</span><span>화면에 띄우기</span>
		</nav>
		<h1>화면에 띄워<br /><b>다 같이 맞히기</b></h1>
		<p class="lead">
			교실 TV나 모임 프로젝터에 초성을 크게 띄워요. 진행자가 한 번 누르면 힌트가, 한 번 더 누르면 정답이 나와요.
			따로 문제를 만들거나 정답지를 뽑아 둘 필요가 없어요.
		</p>
	</header>

	<section class="setup" aria-label="띄우기 설정">
		<h2 class="sh">분야</h2>
		<div class="chips" role="radiogroup" aria-label="분야">
			<button role="radio" aria-checked={cat === 'all'} class:on={cat === 'all'} onclick={() => (cat = 'all')}>
				전체 <span>{total}</span>
			</button>
			{#each data.cats as c (c.slug)}
				<button role="radio" aria-checked={cat === c.slug} class:on={cat === c.slug} onclick={() => (cat = c.slug)}>
					{c.name} <span>{c.count}</span>
				</button>
			{/each}
		</div>

		<h2 class="sh">문제 수</h2>
		<div class="chips" role="radiogroup" aria-label="문제 수">
			{#each SIZES as n (n)}
				<button role="radio" aria-checked={size === n} class:on={size === n} onclick={() => (size = n)}>{n}문제</button>
			{/each}
		</div>

		<h2 class="sh">난이도</h2>
		<div class="levels" role="radiogroup" aria-label="난이도">
			{#each LEVELS as l (l.key)}
				<button role="radio" aria-checked={level === l.key} class:on={level === l.key} onclick={() => (level = l.key)}>
					<b>{l.name}</b><span>{l.note}</span>
				</button>
			{/each}
		</div>

		<button class="cta" onclick={start}>{catName} {size}문제 띄우기 <span aria-hidden="true">→</span></button>
		<p class="sub">오늘의 초성 문제는 빼고 뽑아요. 뽑은 문제 안에서는 쉬운 낱말이 먼저 나와요.</p>
	</section>

	<section class="sec">
		<h2 class="sh">이렇게 진행해요</h2>
		<ol class="steps">
			<li><b>초성만 보여 주기.</b> 화면 아무 곳이나 누르거나 오른쪽 화살표 · 스페이스를 누르면 다음 단계로 넘어가요.</li>
			<li><b>막히면 힌트.</b> 한 번 더 누르면 뜻풀이 한 줄이 열려요. 「동물」처럼 분야만 알려 줘도 될 때는 힌트 없이 바로 정답으로 가도 돼요.</li>
			<li><b>정답 공개.</b> 정답 아래에 「같은 초성」 줄이 있으면 그 낱말을 외친 사람도 맞힌 거예요.</li>
			<li><b>다음 문제.</b> 끝까지 가면 몇 문제를 했는지 보여 주고, 같은 설정으로 새로 섞을 수 있어요.</li>
		</ol>
		<p class="deep">
			노트북을 TV에 연결했다면 전체 화면 버튼(또는 F 키)을 누르세요. 발표용 리모컨의 다음 · 이전 버튼도 그대로 먹어요.
			휴대폰을 화면 공유로 띄울 때는 가로로 눕히면 초성이 더 크게 나와요. 진행을 멈추려면 ✕나 뒤로가기를 누르면 설정 화면으로 돌아와요.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">모임에 맞게 고르는 법</h2>
		<p class="deep">
			초성 퀴즈는 낱말이 짧을수록 어려워요. ㅋㄲㄹ처럼 세 글자면 초성만으로 거의 하나로 정해지지만, ㅅㅈ처럼 두 글자면
			떠오르는 후보가 너무 많아 오히려 머릿속이 하얘져요. 그래서 난이도는 낱말 길이보다 「얼마나 흔한 낱말인가」와
			「같은 초성의 더 흔한 낱말이 먼저 떠오르는가」로 매겼어요.
		</p>
		<p class="deep">
			어린이나 어르신이 함께라면 <b>쉬움 위주</b>를 고르세요. 분야마다 바로 떠오르는 낱말이
			{#each data.cats as c, i (c.slug)}{c.name} {c.easy}개{i < data.cats.length - 1 ? ', ' : ''}{/each} 있어요.
			어른끼리 겨룬다면 <b>어려움 위주</b>가 재미있어요. 사자성어는 국어 수업 복습용으로, 나라는 사회 시간 수도 · 지도
			이야기와 엮기 좋아요.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">팀 대항으로 할 때</h2>
		<p class="deep">
			두세 팀으로 나눠 먼저 외친 팀이 답할 기회를 가져요. 초성만 보고 맞히면 2점, 힌트가 열린 뒤에 맞히면 1점으로 두면
			힌트를 여는 순간이 긴장돼요. 틀린 답을 외친 팀은 그 문제에서 한 번 쉬게 하면 마구 외치는 것을 막을 수 있어요.
		</p>
		<p class="deep">
			가장 많이 생기는 다툼은 「그것도 답 아니에요?」예요. ㄱㄹ은 고래도 되고 기린도 되죠. 정답 화면의 「같은 초성」 줄에
			나온 낱말은 모두 맞은 것으로 쳐 주세요. 줄에 없는 낱말이라도 초성이 맞고 그 분야에 들어가면 인정해 주는 편이 분위기가
			좋아요. 초성 퀴즈는 낸 사람의 머릿속을 맞히는 놀이가 아니라 규칙에 맞는 낱말을 찾는 놀이니까요.
		</p>
		<p class="deep">
			혼자 연습하고 싶은 사람은 <a class="inl" href="/chosung">초성 퀴즈</a>에서 직접 입력해 풀 수 있고, 막혔을 때 어디부터 붙잡을지는
			<a class="inl" href="/read/chosung-tips">초성 퀴즈 잘 푸는 법</a>에 정리해 두었어요.
		</p>
	</section>

	<OtherGames current="cho" />
</article>

{#if presenting}
	<div class="stage" bind:this={stage} role="dialog" aria-modal="true" aria-label="초성 퀴즈 진행 화면">
		<div class="bar">
			<span class="pos">{ended ? '끝' : `${pos + 1} / ${deck.length}`} · {catName}</span>
			<span class="tools">
				{#if canFull}<button class="tool" onclick={full} aria-label="전체 화면">⛶</button>{/if}
				<button class="tool" onclick={close} aria-label="진행 끝내기">✕</button>
			</span>
		</div>

		{#if cur}
			<button class="board" onclick={forward} aria-label="다음 단계로">
				<span class="cho" class:long={cur.word.length >= 5}>{chosungOf(cur.word)}</span>
				<span class="meta">{cur.word.length}글자 · {categoryBySlug(cur.category)?.name}</span>
				<span class="hint" class:show={step >= 1}>{cur.hint}</span>
				<span class="answer" class:show={step >= 2}>{cur.word}</span>
				{#if step >= 2 && alsoOk.length}<span class="also">같은 초성 · {alsoOk.join(' · ')}</span>{/if}
			</button>
			<div class="ctl">
				<button class="c" onclick={back} disabled={pos === 0 && step === 0}>← 이전</button>
				<button class="c" onclick={() => (step = Math.max(step, 1))} disabled={step >= 1}>힌트</button>
				<button class="c" onclick={() => (step = 2)} disabled={step >= 2}>정답</button>
				<button class="c go" onclick={next}>{pos === deck.length - 1 ? '끝내기' : '다음'} →</button>
			</div>
		{:else}
			<div class="end">
				<p class="big">{deck.length}문제 끝!</p>
				<p class="small">같은 설정으로 새로 섞거나, 분야를 바꿔 다시 띄워 보세요.</p>
				<div class="ctl">
					<button class="c" onclick={back}>← 마지막 문제</button>
					<button class="c go" onclick={again}>새로 섞기</button>
					<button class="c" onclick={close}>설정 바꾸기</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 8px 2px;
		word-break: keep-all;
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
	.chips button,
	.levels button {
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
	.chips button span {
		color: var(--muted);
		font-weight: 600;
		margin-left: 2px;
	}
	.chips button.on,
	.levels button.on {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}
	.chips button.on span {
		color: #fff;
		opacity: 0.85;
	}
	.levels {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	.levels button {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 10px 6px;
		word-break: keep-all;
	}
	.levels button span {
		font-size: 11.5px;
		font-weight: 600;
		opacity: 0.8;
		text-align: center;
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
	.steps {
		margin: 0;
		padding-left: 22px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 14px;
		line-height: 1.8;
		word-break: keep-all;
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

	/* 진행 화면 — 헤더 · 하단 탭 위를 덮는다(탭 40 · 시트 60 · 스플래시 200) */
	.stage {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: var(--bg, #fbf7ef);
		color: var(--text);
		display: flex;
		flex-direction: column;
		padding: max(12px, env(safe-area-inset-top)) 16px max(14px, env(safe-area-inset-bottom));
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: max(15px, 3vh);
		font-weight: 800;
		color: var(--muted);
	}
	.tools {
		display: flex;
		gap: 6px;
	}
	.tool {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font-size: 18px;
		cursor: pointer;
	}
	.board {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2vh;
		background: none;
		border: 0;
		color: inherit;
		font: inherit;
		cursor: pointer;
		text-align: center;
		padding: 8px 0;
	}
	.cho {
		font-size: min(22vw, 30vh);
		font-weight: 900;
		letter-spacing: 0.08em;
		line-height: 1.05;
		white-space: nowrap;
	}
	.cho.long {
		font-size: min(15vw, 24vh);
	}
	.meta {
		font-size: min(4.5vw, 3.2vh);
		font-weight: 700;
		color: var(--muted);
	}
	.hint,
	.answer {
		visibility: hidden;
		word-break: keep-all;
		max-width: 92%;
	}
	.hint.show,
	.answer.show {
		visibility: visible;
	}
	.hint {
		font-size: min(5.5vw, 4.4vh);
		line-height: 1.45;
		font-weight: 600;
	}
	.answer {
		font-size: min(13vw, 13vh);
		font-weight: 900;
		color: var(--accent-text);
		line-height: 1.1;
	}
	.also {
		font-size: min(4.5vw, 3.4vh);
		font-weight: 700;
		color: var(--muted);
	}
	.ctl {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}
	.end .ctl {
		grid-template-columns: repeat(3, 1fr);
		width: min(100%, 560px);
	}
	.c {
		min-height: 50px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font: inherit;
		font-size: 15px;
		font-weight: 800;
		cursor: pointer;
		word-break: keep-all;
	}
	.c:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.c.go {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.end {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		text-align: center;
	}
	.end .big {
		margin: 0;
		font-size: min(12vw, 12vh);
		font-weight: 900;
	}
	.end .small {
		margin: 0 0 8px;
		font-size: 15px;
		color: var(--muted);
		word-break: keep-all;
	}
</style>
