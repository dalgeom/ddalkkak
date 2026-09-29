<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { track } from '$lib/analytics';
	import { kstDayNumber } from '$lib/game';
	import { CHOSUNG_CATEGORIES } from '$lib/data/chosung';
	import { CHOSUNG_WORDS, chosungOf, isCorrect, chosungOfDay, categoryBySlug } from '$lib/chosung';
	import { nextStreak, shownStreak, type DayStreak } from '$lib/dailyStreak';
	import PushPrompt from '$lib/components/PushPrompt.svelte';
	import DailyBand from '$lib/components/DailyBand.svelte';

	type Mode = { type: 'today' } | { type: 'free'; cat: string };

	let screen = $state<'menu' | 'play'>('menu');
	let mode = $state<Mode>({ type: 'free', cat: 'all' });

	let done = $state<number[]>([]);
	let solved = $state(0);
	let daily = $state<DayStreak | null>(null);
	let day = $state(0);

	let idx = $state(-1);
	let input = $state('');
	let tries = $state(0);
	let hintOpen = $state(false);
	let status = $state<'no' | 'won' | 'revealed'>('no');
	let feedback = $state('');
	let shaking = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	let cur = $derived(idx >= 0 ? CHOSUNG_WORDS[idx] : null);
	let curCat = $derived(cur ? categoryBySlug(cur.category) : null);
	let todayIdx = $derived(day ? chosungOfDay(day) : -1);
	let todayWord = $derived(todayIdx >= 0 ? CHOSUNG_WORDS[todayIdx] : null);
	let todayDone = $derived(!!day && daily?.day === day);
	let todayWon = $derived(todayDone && (daily?.streak ?? 0) > 0);
	let dailyStreak = $derived(day ? shownStreak(daily, day) : 0);
	let tomorrowPeek = $derived.by(() => {
		if (!day) return null;
		const w = CHOSUNG_WORDS[chosungOfDay(day + 1)];
		return { chip: `초성 · ${categoryBySlug(w.category)?.name ?? ''}`, line: chosungOf(w.word) };
	});

	function load() {
		try {
			done = JSON.parse(localStorage.getItem('ddal.cho.done') || '[]');
			solved = Number(localStorage.getItem('ddal.cho.solved') || 0);
			daily = JSON.parse(localStorage.getItem('ddal.cho.daily') || 'null');
		} catch {
			/* 무시 */
		}
	}
	function persist() {
		if (!browser) return;
		try {
			localStorage.setItem('ddal.cho.done', JSON.stringify(done));
			localStorage.setItem('ddal.cho.solved', String(solved));
			if (daily) localStorage.setItem('ddal.cho.daily', JSON.stringify(daily));
		} catch {
			/* 무시 */
		}
	}

	function pick(cat: string): number {
		const inCat = CHOSUNG_WORDS.map((w, i) => ({ w, i })).filter(({ w }) => cat === 'all' || w.category === cat);
		let pool = inCat.filter(({ i }) => !done.includes(i));
		if (!pool.length) {
			// 그 분야를 다 풀었으면 그 분야만 다시 섞는다 — 다른 분야 기록은 남긴다
			done = done.filter((i) => !inCat.some((x) => x.i === i));
			pool = inCat;
		}
		// 오늘의 초성은 연습에서 빼 둔다 — 연습하다 오늘 문제를 미리 보면 김이 샌다
		const safe = pool.filter(({ i }) => i !== todayIdx);
		const from = safe.length ? safe : pool;
		return from[Math.floor(Math.random() * from.length)].i;
	}

	function start(m: Mode) {
		mode = m;
		screen = 'play';
		next();
		track(m.type === 'today' ? 'chosung_daily_start' : 'chosung_start', {
			cat: m.type === 'free' ? m.cat : 'today'
		});
	}

	function next() {
		idx = mode.type === 'today' ? todayIdx : pick(mode.cat);
		input = '';
		tries = 0;
		hintOpen = false;
		status = 'no';
		feedback = '';
		setTimeout(() => inputEl?.focus(), 0);
	}

	function finishToday(result: 'won' | 'revealed') {
		if (todayDone) return;
		daily = nextStreak(daily, day, result);
		track(result === 'won' ? 'chosung_daily_solve' : 'chosung_daily_reveal', { streak: daily.streak });
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!cur || status !== 'no' || !input.trim()) return;
		if (isCorrect(cur, input)) {
			status = 'won';
			solved++;
			if (!done.includes(idx)) done = [...done, idx];
			if (mode.type === 'today') finishToday('won');
			persist();
			const same = input.replace(/\s+/g, '') === cur.word;
			feedback = same
				? tries === 0
					? '딸깍! 한 번에 맞혔어요'
					: `딸깍! ${tries + 1}번 만에 맞혔어요`
				: `딸깍! 정답이에요 — 준비한 답은 「${cur.word}」`;
			track('chosung_solve', { tries: tries + 1, hint: hintOpen });
		} else {
			tries++;
			feedback = '아니에요!';
			shaking = true;
			setTimeout(() => (shaking = false), 420);
		}
	}

	function openHint() {
		hintOpen = true;
		track('chosung_hint');
		inputEl?.focus();
	}

	function reveal() {
		if (!cur || status !== 'no') return;
		status = 'revealed';
		if (!done.includes(idx)) done = [...done, idx];
		if (mode.type === 'today') finishToday('revealed');
		persist();
		feedback = `정답: ${cur.word}`;
		track('chosung_reveal');
	}

	function toMenu() {
		screen = 'menu';
	}

	onMount(() => {
		load();
		day = kstDayNumber(Date.now());
		track('chosung_daily_seen', { done: todayDone, streak: dailyStreak });
		// 분야 페이지의 「이 분야 풀기」가 ?c=<분야>로 들어온다
		const c = page.url.searchParams.get('c');
		if (c && categoryBySlug(c)) start({ type: 'free', cat: c });
	});

	const total = CHOSUNG_WORDS.length;
</script>

<svelte:head>
	<title>초성 퀴즈 {total}문제 — 동물·음식·나라·사자성어 초성 게임 | 딸깍</title>
	<meta
		name="description"
		content="초성 퀴즈 {total}문제를 바로 풉니다. 동물·음식·과일·채소·나라·사자성어 초성을 보고 낱말을 맞히세요. 막히면 뜻 힌트, 매일 새 오늘의 초성과 연속 기록."
	/>
	<link rel="canonical" href="https://ddalkkak.app/chosung" />
	<meta property="og:title" content="초성 퀴즈 {total}문제 — 동물·음식·나라·사자성어 초성 게임 | 딸깍" />
	<meta property="og:description" content="초성만 보고 낱말을 맞히세요. 매일 새 오늘의 초성." />
	<meta property="og:url" content="https://ddalkkak.app/chosung" />
</svelte:head>

<div class="croot">
	{#if screen === 'menu'}
		<div class="menu">
			<header class="cover">
				<span class="kicker">초성 퀴즈</span>
				<h1>초성만 보고<br /><b>낱말을 맞히세요</b></h1>
				<p class="lead">
					ㄱㅇㅇ는 무엇일까요? 분야를 고르면 초성이 나옵니다. 막히면 뜻 힌트가 한 줄 열려요. 준비된
					문제 {total}개.
				</p>
				<div class="facts">
					<div class="fact"><b>{solved}</b><span>맞힌 낱말</span></div>
					<div class="fact"><b>{dailyStreak}</b><span>오늘의 초성 연속</span></div>
					<div class="fact"><b>{CHOSUNG_CATEGORIES.length}</b><span>분야</span></div>
				</div>
			</header>

			{#if todayWord}
				<section class="today" class:done={todayDone}>
					<div class="t-top">
						<span class="kicker">오늘의 초성 · {categoryBySlug(todayWord.category)?.name}</span>
						{#if dailyStreak > 0}<span class="t-streak">🔥 {dailyStreak}일 연속</span>{/if}
					</div>
					{#if todayDone}
						<p class="t-done">
							{todayWon ? '오늘 초성을 풀었어요.' : '오늘 초성은 정답을 봤어요.'} 내일 자정에 새 문제가 열려요.
						</p>
					{:else}
						<div class="tiles small">
							{#each [...chosungOf(todayWord.word)] as ch, i (i)}<span class="tile">{ch}</span>{/each}
						</div>
						<button class="big" onclick={() => start({ type: 'today' })}>
							풀어 보기 <span class="arr" aria-hidden="true">→</span>
						</button>
						<p class="t-note">하루 한 문제, 모두 같은 문제예요. 매일 풀면 연속 기록이 쌓입니다.</p>
					{/if}
				</section>
			{/if}

			<section class="sec">
				<h2 class="mh">분야 골라 풀기</h2>
				<p class="mp">시간 제한 없이 계속 나옵니다. 푼 낱말은 한 바퀴 돌 때까지 다시 안 나와요.</p>
				<div class="cats">
					<button class="cat all" onclick={() => start({ type: 'free', cat: 'all' })}>
						<b>전체</b><span>{total}</span>
					</button>
					{#each CHOSUNG_CATEGORIES as c (c.slug)}
						<button class="cat" onclick={() => start({ type: 'free', cat: c.slug })}>
							<b>{c.name}</b><span>{c.words.length}</span>
						</button>
					{/each}
				</div>
			</section>

			<DailyBand>초성 말고도, 매일 <b>10문제</b>씩 새로 나와요</DailyBand>

			<!-- 검색으로 들어온 사람에게 이 놀이가 뭔지 설명한다. 놀이 흐름을 막지 않도록 아래에 둔다 -->
			<section class="sec about">
				<h2 class="mh">초성 퀴즈란</h2>
				<p class="mp long">
					낱말의 각 글자에서 첫 자음만 남긴 것을 보고 원래 낱말을 맞히는 놀이입니다. 「떡볶이」는
					ㄸㅂㅇ, 「코끼리」는 ㅋㄲㄹ가 됩니다. 분야를 알면 후보가 확 줄어서, 초성 서너 개로도 낱말이
					떠오릅니다.
				</p>
				<p class="mp long">
					오히려 두 글자가 어렵습니다. ㅅㅈ, ㄱㄹ처럼 짧으면 떠오르는 후보가 너무 많아서 머릿속이 비어
					버리거든요. 한 분야에서 초성이 같은 낱말(ㄱㄹ = 고래·기린)은 둘 다 정답으로 받습니다.
				</p>
				<h3 class="kh">분야별로 모아 보기</h3>
				<div class="links">
					{#each CHOSUNG_CATEGORIES as c (c.slug)}
						<a class="link" href="/chosung/{c.slug}">{c.title}</a>
					{/each}
				</div>
			</section>
		</div>
	{:else if cur}
		<div class="topbar">
			<span class="run">
				{mode.type === 'today' ? '오늘의 초성' : '초성 퀴즈'} · {curCat?.name}
			</span>
			<span class="cnt">{cur.word.length}글자</span>
		</div>

		<div class="card">
			<div class="tiles" class:shaking>
				{#each [...chosungOf(cur.word)] as ch, i (i)}<span class="tile">{ch}</span>{/each}
			</div>

			{#if hintOpen || status !== 'no'}
				<p class="hint"><span>힌트</span>{cur.hint}</p>
			{/if}

			{#if status === 'no'}
				<form class="ans" onsubmit={submit}>
					<input
						bind:this={inputEl}
						bind:value={input}
						type="text"
						inputmode="text"
						autocomplete="off"
						autocapitalize="off"
						spellcheck="false"
						placeholder="{curCat?.name} 이름 입력"
						aria-label="정답 입력"
					/>
					<button class="btn" type="submit">확인</button>
				</form>
			{/if}

			{#if feedback}
				<div class="feedback" class:ok={status === 'won'} role="alert" aria-live="assertive">{feedback}</div>
			{/if}

			{#if status === 'no'}
				<div class="controls">
					{#if !hintOpen}<button class="btn ghost" onclick={openHint}>힌트 보기</button>{/if}
					<button class="btn ghost" onclick={reveal}>정답 보기</button>
					<button class="btn ghost" onclick={toMenu}>나가기</button>
				</div>
			{:else if mode.type === 'today'}
				<p class="t-after">
					{#if todayWon}🔥 <b>{daily?.streak}일 연속</b> · 내일 자정에 새 문제{:else}내일 문제를 맞히면 연속 기록이 시작돼요{/if}
				</p>
				<PushPrompt dayNum={day} streak={daily?.streak ?? 0} tomorrow={tomorrowPeek} slot="chosung" />
				<button class="btn wide" onclick={() => start({ type: 'free', cat: cur.category })}>
					{curCat?.name} 이어서 풀기 →
				</button>
				<button class="btn ghost wide" onclick={toMenu}>분야 선택으로</button>
			{:else}
				<button class="btn wide" onclick={next}>다음 문제 →</button>
				<button class="btn ghost wide" onclick={toMenu}>분야 선택으로</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.menu {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 24px 20px 20px;
	}
	.kicker {
		display: inline-block;
		font-size: 11.5px;
		font-weight: 800;
		letter-spacing: 0.4px;
		color: var(--accent-text);
		background: var(--correct-bg);
		border-radius: 7px;
		padding: 4px 11px;
	}
	h1 {
		margin: 12px 0 8px;
		font-size: 24px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent-text);
	}
	.lead {
		font-size: 13.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 16px;
	}
	.fact {
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 10px 4px;
		text-align: center;
	}
	.fact b {
		display: block;
		font-size: 17px;
		font-weight: 800;
		color: var(--accent-text);
		font-variant-numeric: tabular-nums;
	}
	.fact span {
		font-size: 11.5px;
		color: var(--muted-2);
		word-break: keep-all;
	}

	/* 오늘의 초성 — /matchstick의 오늘의 성냥개비 카드와 같은 모양 */
	.today {
		background: var(--panel);
		border: 2px solid var(--accent);
		border-radius: 18px;
		padding: 16px;
	}
	.today.done {
		border-color: var(--border-strong);
	}
	.t-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 6px 10px;
	}
	.t-streak {
		font-size: 13.5px;
		font-weight: 800;
		color: var(--accent-text);
	}
	.t-done,
	.t-note {
		margin-top: 10px;
		font-size: 13.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.t-done {
		color: var(--text);
		font-weight: 700;
	}
	.t-after {
		margin: 4px 0 0;
		text-align: center;
		font-size: 14.5px;
		line-height: 1.7;
		word-break: keep-all;
	}

	.tiles {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 8px;
		margin: 8px 0 16px;
	}
	.tile {
		width: 54px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--panel-2);
		border: 2px solid var(--border-strong);
		border-radius: 12px;
		font-size: 30px;
		font-weight: 800;
		color: var(--text);
	}
	.tiles.small {
		margin: 14px 0;
	}
	.tiles.small .tile {
		width: 46px;
		height: 50px;
		font-size: 25px;
	}
	.shaking {
		animation: shake 0.4s;
	}
	@keyframes shake {
		20%,
		60% {
			transform: translateX(-6px);
		}
		40%,
		80% {
			transform: translateX(6px);
		}
	}

	.sec {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 18px;
		padding: 18px 16px;
	}
	.mh {
		margin: 0 0 4px;
		font-size: 17px;
		font-weight: 800;
		word-break: keep-all;
	}
	.mp {
		margin: 0 0 12px;
		font-size: 13px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.mp.long {
		font-size: 14px;
		line-height: 1.85;
	}
	.kh {
		margin: 18px 0 8px;
		font-size: 14.5px;
		font-weight: 800;
	}
	.cats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
	}
	.cat {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 6px;
		min-height: 48px;
		padding: 10px 14px;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		font-family: inherit;
		color: var(--text);
		cursor: pointer;
		text-align: left;
	}
	.cat b {
		font-size: 15px;
		font-weight: 800;
		word-break: keep-all;
	}
	.cat span {
		font-size: 12.5px;
		color: var(--muted-2);
		font-variant-numeric: tabular-nums;
	}
	.cat.all {
		grid-column: 1 / -1;
		border-color: var(--accent);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.link {
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 9px;
		padding: 7px 11px;
		text-decoration: none;
	}
	.link:hover {
		background: var(--panel-2);
	}

	.big {
		width: 100%;
		padding: 15px;
		border: none;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 16px;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.big:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}

	/* ── 풀이 화면 ── */
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
		min-height: 36px;
	}
	.run {
		font-size: 17px;
		font-weight: 800;
		color: var(--accent-text);
	}
	.cnt {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted-2);
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 20px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.hint {
		margin: 0;
		padding: 10px 13px;
		background: var(--panel-2);
		border-left: 3px solid var(--accent);
		border-radius: 0 12px 12px 0;
		font-size: 14px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.hint span {
		margin-right: 8px;
		font-size: 12px;
		font-weight: 800;
		color: var(--accent-text);
	}
	.ans {
		display: flex;
		gap: 8px;
	}
	.ans input {
		flex: 1;
		min-width: 0;
		min-height: 50px;
		padding: 0 14px;
		border: 2px solid var(--border-strong);
		border-radius: 12px;
		background: var(--panel);
		color: var(--text);
		font-size: 18px;
		font-weight: 700;
		font-family: inherit;
	}
	.ans input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.feedback {
		text-align: center;
		font-size: 15px;
		font-weight: 800;
		color: var(--danger);
		word-break: keep-all;
	}
	.feedback.ok {
		color: var(--accent-text);
	}
	.controls {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.btn {
		min-height: 50px;
		padding: 0 16px;
		border: none;
		border-radius: 12px;
		background: var(--accent);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
		white-space: nowrap;
	}
	.btn.ghost {
		background: var(--panel);
		color: var(--text);
		border: 1px solid var(--border-strong);
		font-weight: 700;
		padding: 0 8px;
	}
	.btn.wide {
		width: 100%;
	}
</style>
