<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { dev, version } from '$app/environment';
	import { track } from '$lib/analytics';
	import { kstDayNumber } from '$lib/game';
	import { TIERS, tierName, type Tier } from '$lib/tiers';
	import { charTable, makeDict, last, movesFrom, type Dict, type Reject, type Table } from '$lib/kkeut';
	import { firstWord, giveUp, newDuel, newFree, newPuzzle, play, DUEL_LIMIT, type Game } from '$lib/kkeutGame';
	import { KKEUT_FIRST_DAY, puzzleFor, type KkeutPuzzle } from '$lib/data/kkeutPuzzles';
	import { nextStreak, shownStreak, type DayStreak } from '$lib/dailyStreak';
	import { KKEUT_WORDS } from '$lib/data/kkeutMeta';
	import DailyNext from '$lib/components/DailyNext.svelte';
	import { shareResult as shareCardResult, outcomeMessage } from '$lib/shareCard';
	import { playHistory } from '$lib/playHistory.svelte';

	/*
	 * 끝말잇기(2026-11-03) — 오늘의 퍼즐(N수 안에 컴퓨터 막기)과 컴퓨터 대결 5단계.
	 * 사전(static/kkeut/words.json)은 이 화면에서만 받는다. 뜻풀이는 판 끝에 그 판에 나온 말의 조각만 받는다.
	 * 설계: docs/superpowers/specs/2026-11-03-kkeut-design.md
	 */
	const DAILY_KEY = 'ddal.kkeut.daily';
	const TIER_KEY = 'ddal.kkeut.tier';
	const TRIES_KEY = 'ddal.kkeut.tries';
	const FREE_KEY = 'ddal.kkeut.free'; // 진검승부 최고 기록(받아친 수)
	const WHY: Record<Reject, string> = {
		short: '두 글자 이상으로 써 주세요.',
		first: '앞말의 끝 글자로 시작해야 해요.',
		notword: '사전에 없는 말이에요. 다른 말을 써 보세요.',
		used: '이미 나온 말이에요.'
	};
	const today = () => (dev && Number(new URL(location.href).searchParams.get('day'))) || kstDayNumber(Date.now());

	let dict = $state.raw<Dict | null>(null);
	let loadErr = $state(false);
	let table: Table | null = null;
	let puzzle = $state<KkeutPuzzle | null>(null);
	let day = $state(0);
	let streak = $state<DayStreak | null>(null);
	let cleared = $state(0); // 깬 단계 수(0 = 아무것도)
	let freeBest = $state(0);
	let freeNew = $state(false); // 이번 판이 최고 기록을 넘었나
	let game = $state<Game | null>(null);
	let tries = $state(0);
	let hint = $state(false);
	let input = $state('');
	let msg = $state('');
	let giveHints: string[] = $state([]);
	/** 퍼즐을 놓친 까닭 — 끝 화면이 「받아쳤어요」만 말해서 왜 끝났는지 몰랐다(11/12 미리 풀기) */
	const failWhy = $derived.by(() => {
		if (!game || game.mode !== 'puzzle' || game.end !== 'fail' || !dict) return '';
		const c = last(game.chain[game.chain.length - 1].word);
		return movesFrom(dict, c, game.used).length
			? `${game.n}수 안에 컴퓨터를 막지 못했어요.`
			: `컴퓨터가 「${c}」(으)로 끝나는 말로 막았어요. 「${c}」(으)로 시작하는 말이 없어요.`;
	});
	let defs: Record<string, string> = $state({});
	let field: HTMLInputElement | undefined = $state();

	const read = <T,>(k: string): T | null => {
		try {
			return JSON.parse(localStorage.getItem(k) ?? 'null');
		} catch {
			return null;
		}
	};
	const write = (k: string, v: unknown) => {
		try {
			localStorage.setItem(k, JSON.stringify(v));
		} catch {}
	};

	onMount(async () => {
		day = today();
		puzzle = puzzleFor(day);
		streak = read<DayStreak>(DAILY_KEY);
		cleared = read<number>(TIER_KEY) ?? 0;
		freeBest = read<number>(FREE_KEY) ?? 0;
		const t = read<{ day: number; tries: number }>(TRIES_KEY);
		if (t && t.day === day) tries = t.tries;
		try {
			const res = await fetch('/kkeut/words.json');
			if (!res.ok) throw new Error(String(res.status));
			const j = await res.json();
			dict = makeDict(j.words, j.easy);
			table = charTable(dict);
		} catch {
			loadErr = true;
		}
	});

	let doneToday = $derived(!!streak && streak.day === day);
	// 해설 쪽은 빌드 날짜 기준 어제까지만 굽는다(answer/[date]) — 그보다 앞날을 가리키면 404라 빌드 날짜로 묶는다
	const built = kstDayNumber(Number(version));
	let ansDay = $derived(Math.min(day || built, built) - 1);
	let answer = $derived(ansDay >= KKEUT_FIRST_DAY ? puzzleFor(ansDay) : null);
	let mineCount = $derived(game ? game.chain.filter((x) => x.who === 'me').length : 0);
	let pn = $derived(puzzle ? (puzzle.line.length + 1) / 2 : 0); // 오늘 퍼즐의 내 수
	let goal = $derived(!game ? 0 : game.mode === 'puzzle' ? game.n : game.mode === 'duel' ? DUEL_LIMIT : 0); // 0 = 제한 없음
	let now = $derived(game ? game.chain[game.chain.length - 1] : null); // 가운데 크게 보이는 지금 말
	let trail = $derived(game ? game.chain.slice(-7, -1) : []); // 지난 말 — 최근 여섯만 한 줄로

	function startPuzzle() {
		if (!puzzle) return;
		game = newPuzzle(puzzle.start, pn, puzzle.line);
		msg = '';
		track('kkeut_daily_start', { n: game.n });
		ph.enter();
		focus();
	}
	function startDuel(tier: Tier) {
		if (!dict || !table) return;
		game = newDuel(tier, firstWord(dict, table, tier));
		msg = '';
		giveHints = [];
		track('kkeut_duel_start', { tier });
		ph.enter();
		focus();
	}
	function startFree() {
		if (!dict || !table) return;
		game = newFree(firstWord(dict, table, 5));
		msg = '';
		giveHints = [];
		freeNew = false;
		track('kkeut_free_start', { best: freeBest });
		ph.enter();
		focus();
	}
	const focus = () => setTimeout(() => field?.focus(), 50);
	/** 긴 판에서 새 말 · 거절 문구가 화면 밖으로 밀리지 않게 마지막 말을 입력창 위로 — 판이 끝났으면 결과(.end)를 */
	async function toEnd() {
		await tick();
		(document.querySelector('.end') ?? document.querySelector('.now'))?.scrollIntoView({ block: 'nearest' });
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!game || !dict || !table || !input.trim()) return;
		const why = play(game, dict, table, input); // game은 $state 프록시라 안을 바꾸면 그대로 다시 그린다
		if (why) {
			msg = ''; // 같은 문구가 연달아 나와도 aria-live가 다시 읽고 눈에도 바뀐 게 보이게 한 번 비운다
			await tick();
			msg = WHY[why];
			toEnd();
			return;
		}
		input = '';
		msg = '';
		if (game.end) finish();
		else focus();
		toEnd();
	}

	function finish() {
		if (!game) return;
		const moves = mineCount;
		if (game.mode === 'puzzle') {
			if (game.end === 'win') {
				streak = nextStreak(read<DayStreak>(DAILY_KEY) ?? streak, day, 'won');
				write(DAILY_KEY, streak);
				track('kkeut_daily_solve', { n: game.n, tries: tries + 1 });
			} else miss();
		} else if (game.mode === 'free') {
			endFree(game.end ?? 'lose');
		} else {
			track(`kkeut_duel_${game.end}`, { tier: game.tier, moves });
			if (game.end === 'win' && game.tier > cleared) {
				cleared = game.tier;
				write(TIER_KEY, cleared);
			}
		}
		loadDefs(game.chain.map((x) => x.word));
	}

	function miss() {
		tries++;
		write(TRIES_KEY, { day, tries });
		if (tries >= 3) reveal();
	}

	function reveal() {
		streak = nextStreak(read<DayStreak>(DAILY_KEY) ?? streak, day, 'revealed');
		write(DAILY_KEY, streak);
		track('kkeut_daily_reveal', { n: pn });
		if (puzzle) loadDefs([puzzle.start, ...puzzle.line]);
	}

	function endFree(result: string) {
		const moves = mineCount;
		freeNew = moves > freeBest;
		if (freeNew) {
			freeBest = moves;
			write(FREE_KEY, moves);
		}
		track('kkeut_free_end', { result, moves, best: freeBest });
	}

	function quit() {
		if (!game || !dict) return;
		giveHints = giveUp(game, dict);
		if (game.mode === 'free') endFree('giveup');
		else track('kkeut_duel_giveup', { tier: game.tier, moves: mineCount });
		loadDefs(game.chain.map((x) => x.word));
		toEnd();
	}

	async function loadDefs(words: string[]) {
		const cho = (w: string) => Math.floor((w.charCodeAt(0) - 0xac00) / 588);
		const need = [...new Set(words.map(cho))];
		const parts = await Promise.all(need.map((n) => fetch(`/kkeut/defs/${n}.json`).then((r) => r.json()).catch(() => ({}))));
		const out: Record<string, string> = {};
		for (const w of words) for (const p of parts) if (p[w]) out[w] = p[w];
		defs = { ...defs, ...out }; // 세 번째 실패 때 reveal(정답 길)과 finish(이번 판)가 함께 부른다 — 늦게 온 쪽이 덮지 않게
	}

	// 푸는 중 휴대폰 뒤로가기도 이 메뉴로(11/12 점검 — 전에는 직전 페이지로 나가 버렸다)
	const ph = playHistory(() => {
		if (!game) return;
		leaveGame();
	});
	const back = () => ph.leave();
	function leaveGame() {
		// 퍼즐을 한 수라도 둔 뒤 나가면 한 번 놓친 것 — 질 것 같을 때 나갔다 다시 들어오는 길을 막는다
		if (game?.mode === 'puzzle' && !game.end && mineCount > 0) miss();
		game = null;
		input = '';
		msg = '';
		giveHints = [];
	}

	// 막은 뒤 공유가 없었다(11/12 점검) — 성냥 · 초성과 같은 카드, 정답 낱말은 적지 않는다
	let toastMsg = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;
	async function share() {
		const n = streak?.streak ?? 1;
		const sub = tries === 0 ? '한 번에 막았어요' : `${tries + 1}번 만에 막았어요`;
		const text = `딸깍! 오늘의 끝말잇기 · ${sub} · 🔥 ${n}일 연속\n${location.origin}/kkeut?ref=kkeut\n#딸깍`;
		const msgText = outcomeMessage(
			await shareCardResult({ title: '오늘의 끝말잇기', scoreLabel: `${n}일 연속`, emojiRow: '🔥'.repeat(Math.min(n, 10)), subLine: sub, cta: '너도 도전해봐!' }, text)
		);
		if (!msgText) return;
		toastMsg = msgText;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2200);
	}

	async function toDuel() {
		back();
		// 나가기는 기록 칸을 되돌려(history.back) 메뉴로 가므로 메뉴가 그려질 때까지 기다린다
		for (let i = 0; i < 40 && game; i++) await new Promise((r) => setTimeout(r, 25));
		await tick();
		document.getElementById('duel')?.scrollIntoView({ block: 'start' });
	}
</script>

<svelte:head>
	<title>끝말잇기 — 컴퓨터와 대결 · 오늘의 끝말잇기 퍼즐 | 딸깍</title>
	<meta
		name="description"
		content="국립국어원 한국어기초사전 명사 {KKEUT_WORDS.toLocaleString()}개로 컴퓨터와 끝말잇기를 해요. 새싹부터 고수까지 5단계, 매일 새 「N수 안에 컴퓨터 막기」 퍼즐."
	/>
	<link rel="canonical" href="https://ddalkkak.app/kkeut" />
	<meta property="og:title" content="끝말잇기 — 컴퓨터와 대결 · 오늘의 퍼즐 | 딸깍" />
	<meta property="og:description" content="새싹부터 고수까지 컴퓨터와 끝말잇기. 매일 새 퍼즐." />
	<meta property="og:url" content="https://ddalkkak.app/kkeut" />
</svelte:head>

<div class="kroot">
	{#if !game}
		<header class="cover">
						<h1><span class="kicker">끝말잇기 게임</span>컴퓨터와<br /><b>끝말잇기</b></h1>
			<p class="lead">두 글자 이상 명사로, 두음법칙은 인정해요. 사전에 있는 말 {KKEUT_WORDS.toLocaleString()}개를 받아요.</p>
		</header>

		{#if puzzle}
			<section class="card today">
				<div class="top">
					<span class="kicker">오늘의 끝말잇기 · {pn}수 안에 막기</span>
					{#if shownStreak(streak, day) > 0}<span class="streak">🔥 {shownStreak(streak, day)}일 연속</span>{/if}
				</div>
				<p class="start">컴퓨터: <b>{puzzle.start}</b></p>
				{#if doneToday}
					<p class="note">{streak?.streak ? '오늘 퍼즐을 풀었어요.' : '오늘 퍼즐은 정답을 봤어요.'} 내일 자정에 새 퍼즐이 열려요.</p>
					{#if !streak?.streak}
						<ol class="line">
							{#each puzzle.line as w, i (w)}<li class:me={i % 2 === 0}>{i % 2 === 0 ? '나' : '컴퓨터'} · <b>{w}</b>{#if defs[w]}<span>{defs[w]}</span>{/if}</li>{/each}
						</ol>
					{/if}
				{:else}
					<p class="note">
						{pn === 1
							? '이어 받을 말이 없는 한 마디를 찾으세요.'
							: `내 말 ${pn}개 안에 컴퓨터가 더 이을 말이 없게 만드세요.`}
						{#if tries > 0}<em>{tries}번 놓쳤어요 · {3 - tries}번 남았어요</em>{/if}
					</p>
					<button class="big" disabled={!dict} onclick={startPuzzle}>{dict ? '풀어 보기' : loadErr ? '사전을 못 불러왔어요' : '사전 불러오는 중'}</button>
				{/if}
				{#if answer}<a class="ghost" href="/kkeut/answer/{answer.date}" onclick={() => track('kkeut_answer_open', { from: 'today' })}>어제 퍼즐 해설 보기</a>{/if}
			</section>
		{/if}

		<section class="card" id="duel">
			<h2>컴퓨터와 대결</h2>
			<p class="note">이기면 다음 단계가 열려요. {DUEL_LIMIT}번 받아치면 이겨요.</p>
			{#if loadErr}<p class="msg" role="alert">사전을 못 불러왔어요 · 새로 고침해 주세요.</p>{/if}
			<div class="tiers">
				{#each TIERS as t (t.tier)}
					<button class="tier" disabled={!dict || t.tier > cleared + 1} onclick={() => startDuel(t.tier)}>
						<b>{t.name}</b><span>{t.tier <= cleared ? '깼어요' : t.tier > cleared + 1 ? '잠김' : t.who}</span>
					</button>
				{/each}
			</div>
		</section>

		<section class="card free">
			<h2>진검승부</h2>
			<p class="note">수 제한 없이 고수 컴퓨터와 겨뤄요. 먼저 막히는 쪽이 져요.{#if freeBest} 내 최고 기록은 <b>{freeBest}수</b>예요.{/if}</p>
			<button class="big" disabled={!dict} onclick={startFree}>진검승부 시작</button>
		</section>

		<section class="card rules">
			<h2>끝말잇기 규칙</h2>
			<ul class="note">
				<li>앞말의 끝 글자로 시작하는 <b>두 글자 이상 명사</b>를 이어요. 사전은 국립국어원 한국어기초사전 명사 {KKEUT_WORDS.toLocaleString()}개예요.</li>
				<li><b>두음법칙</b>을 인정해요. 「력」으로 끝나면 「역」, 「녀」는 「여」, 「라」는 「나」로 시작해도 돼요.</li>
				<li>한 판에 이미 나온 말은 다시 못 써요. 이을 말이 없는 쪽이 져요.</li>
			</ul>
			<h2>오늘의 끝말잇기</h2>
			<p class="note">
				매일 자정에 새 퍼즐이 열려요. 컴퓨터가 낸 첫 말에 이어, 정해진 수 안에 컴퓨터가 더 받을 말이 없게 만들면 풀려요.
				월~목은 한 수, 금요일은 두 수, 주말은 세 수예요. 세 번 놓치면 정답 길과 뜻풀이를 보여 드려요.
			</p>
			<h2>대결 단계</h2>
			<p class="note">
				내가 {DUEL_LIMIT}번 받아치면 이겨요(그 전에 컴퓨터가 막혀도 이겨요). 새싹 · 쉬움은 쉬운 낱말만 쓰고, 새싹은 받아칠 말이 없는 「한방 단어」를 되도록 내지 않아요.
				보통부터는 사전 전체를 쓰고, 어려움은 한방 단어를 먼저 노리고, 고수는 수를 읽어 가장 받기 어려운 말을 골라요.
			</p>
			<h2>진검승부</h2>
			<p class="note">
				{DUEL_LIMIT}수 제한이 없어요. 고수와 같은 컴퓨터가 끝까지 받아치니, 누가 먼저 이을 말이 없어지는지 겨뤄요. 내가 받아친 수가 기록으로 남아요.
			</p>
		</section>
	{:else}
		<div class="playing">
			<div class="bar">
				<button class="ghost" onclick={back}>← 나가기</button>
				<span>{game.mode === 'puzzle' ? `오늘의 퍼즐 · ${mineCount}/${game.n}수` : game.mode === 'duel' ? `${tierName(game.tier)} · ${mineCount}/${DUEL_LIMIT}` : `진검승부 · ${mineCount}수${freeBest ? ` · 최고 ${freeBest}` : ''}`}</span>
			</div>
			{#if goal}<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax={goal} aria-valuenow={mineCount} aria-label="받아친 수"><i style="width:{(mineCount / goal) * 100}%"></i></div>{/if}

			<!-- 풀이 화면에 「0/1수」만 있어 무엇을 하라는지 몰랐다 — 첫 화면의 목표를 여기서도 말한다(11/11 점검) -->
			{#if !game.end && game.mode === 'puzzle'}
				<p class="note goal">{game.n === 1 ? '컴퓨터가 더 이을 말이 없는 한 마디를 내세요.' : `내 말 ${game.n}개 안에 컴퓨터가 더 이을 말이 없게 만드세요.`}</p>
			{/if}
			<!-- 대결도 「새싹 · 0/20」만 있어 20이 무엇인지 몰랐다 — 목표를 같은 자리에서 말한다(11/12 점검) -->
			{#if !game.end && game.mode === 'duel' && mineCount === 0}
				<p class="note goal">{DUEL_LIMIT}번 받아치면 이겨요. 막히면 「모르겠어요」.</p>
			{/if}
			{#if !game.end && now}
				<ol class="trail" aria-label="지난 말">
					{#if game.chain.length > 7}<li class="more">…</li>{/if}
					{#each trail as x, i (game.chain.length - 7 + i)}<li class:me={x.who === 'me'}>{x.word}</li>{/each}
				</ol>
				<div class="now">
					<span>{now.who === 'cpu' ? '컴퓨터' : '나'}</span>
					<b>{now.word.slice(0, -1)}<u>{last(now.word)}</u></b>
				</div>
				<div class="dock">
					<form onsubmit={submit}>
						<input
							bind:this={field}
							bind:value={input}
							type="text"
							autocomplete="off"
							autocapitalize="off"
							spellcheck="false"
							enterkeyhint="send"
							placeholder="「{last(now.word)}」(으)로 시작하는 말"
							aria-label="이을 말 입력"
						/>
						<button class="big" type="submit" onpointerdown={(e) => e.preventDefault()}>내기</button>
					</form>
					<p class="msg" aria-live="assertive">{msg}</p>
				</div>
				{#if game.mode === 'puzzle' && puzzle && tries > 0}
					{#if hint}<p class="note">힌트: 내 첫 말의 끝 글자는 「{last(puzzle.line[0])}」예요.</p>
					{:else}<button class="ghost" onclick={() => (hint = true)}>힌트 보기</button>{/if}
				{/if}
				{#if game.mode !== 'puzzle'}<button class="ghost" onclick={quit}>모르겠어요</button>{/if}
			{:else}
				<section class="end">
					{#if game.mode === 'puzzle'}
						<h2>{game.end === 'win' ? '막았어요!' : '컴퓨터가 받아쳤어요'}</h2>
						{#if failWhy}<p class="note">{failWhy}</p>{/if}
					{:else if game.mode === 'duel'}
						<h2>{game.end === 'win' ? `${tierName(game.tier)} 단계를 이겼어요!` : game.end === 'lose' ? '이을 말이 없어요, 졌어요' : '이런 말이 있었어요'}</h2>
					{:else}
						<h2>{game.end === 'win' ? `컴퓨터가 막혔어요! ${mineCount}수로 이겼어요` : `${mineCount}번 받아쳤어요`}</h2>
						{#if freeBest}<p class="note">{freeNew ? '새 최고 기록이에요!' : `최고 기록은 ${freeBest}수예요.`}</p>{/if}
					{/if}
					{#if giveHints.length}<p class="note">낼 수 있었던 말: {giveHints.join(' · ')}</p>{/if}

					<h3>이번 판 흐름 · {game.chain.length}마디</h3>
					<ol class="chain">
						{#each game.chain as x, i (i)}
							<li class:me={x.who === 'me'}><b>{x.word}</b>{#if defs[x.word]}<span>{defs[x.word]}</span>{/if}</li>
						{/each}
					</ol>

					{#if game.mode === 'puzzle'}
						{#if game.end === 'win'}
							<!-- 막은 뒤 「처음으로」뿐이었다 — 성냥 · 초성처럼 연속 기록 · 오늘의 10문제로 잇는다(11/11 점검) -->
							<p class="note">🔥 <b>{streak?.streak ?? 1}일 연속</b> · 내일 자정에 새 퍼즐이 열려요</p>
							<button class="big alt" onclick={share}>기록 공유하기</button>
							<DailyNext pitch="오늘의 10문제도 풀어 볼까요?" />
							<button class="big" onclick={toDuel}>컴퓨터와 대결하러 가기</button>
						{:else if tries < 3}
							<button class="big" onclick={startPuzzle}>다시 풀기 ({3 - tries}번 남음)</button>
						{:else}
							<p class="note">세 번 놓쳐서 정답 길을 보여 드려요.</p>
							<button class="big" onclick={back}>정답 길 보기</button>
						{/if}
						{#if answer}<a class="ghost" href="/kkeut/answer/{answer.date}" onclick={() => track('kkeut_answer_open', { from: 'end' })}>어제 퍼즐 해설 보기</a>{/if}
					{:else if game.mode === 'duel'}
						<div class="row">
							<button class="big" onclick={() => game && startDuel(game.tier)}>다시 하기</button>
							{#if game.end === 'win' && game.tier < 5}<button class="big alt" onclick={() => game && startDuel((game.tier + 1) as Tier)}>다음 단계</button>{/if}
						</div>
						{#if game.end === 'win' && game.tier === 5}<button class="big alt" onclick={startFree}>진검승부 하기</button>{/if}
						<!-- 대결이 끝나면 다시 하기 · 다른 단계뿐이라 검색 · 지식iN으로 온 사람이 10문제로 못 갔다(11/12 점검) -->
						<DailyNext pitch="오늘의 10문제도 풀어 볼까요?" />
						<button class="ghost" onclick={back}>오늘의 퍼즐 · 다른 단계</button>
					{:else}
						<button class="big" onclick={startFree}>다시 겨루기</button>
						<button class="ghost" onclick={back}>오늘의 퍼즐 · 단계 대결</button>
					{/if}
					<a class="ghost" href="/games">다른 놀이</a>
				</section>
			{/if}
		</div>
	{/if}

	{#if toastMsg}<div class="toast" role="status" aria-live="polite">{toastMsg}</div>{/if}

	<p class="src">
		낱말과 뜻풀이: <a href="https://krdict.korean.go.kr" rel="noopener">한국어기초사전(국립국어원)</a>,
		<a href="https://creativecommons.org/licenses/by-sa/2.0/kr/" rel="noopener">CC BY-SA 2.0 KR</a> ·
		<a href="/kkeut/LICENSE.txt">목록 파일 안내</a>
	</p>
</div>

<style>
	.kroot { padding-bottom: 20px; } /* 폭 · 좌우 여백은 레이아웃 .wrap이 준다(/chosung .croot와 같이) */
	.cover h1 { font-size: 28px; line-height: 1.25; margin: 6px 0 8px; }
	.kicker { font-size: 13px; font-weight: 800; color: var(--accent); }
	.lead, .note { color: var(--muted); font-size: 15px; line-height: 1.6; }
	.rules h2 + .note { margin-bottom: 14px; }
.goal { margin: 10px 0 0; text-align: center; font-size: 14px; }
	.rules ul { padding-left: 18px; }
	.rules li + li { margin-top: 4px; }
	.note em { display: block; font-style: normal; color: var(--text); margin-top: 4px; }
	.card { margin-top: 18px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--panel); }
	.card h2, .end h2 { font-size: 18px; font-weight: 900; margin-bottom: 6px; }
	.top { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
	.start { font-size: 20px; margin: 10px 0 6px; }
	.big { display: block; width: 100%; min-height: 48px; margin-top: 12px; border: 0; border-radius: 14px; background: var(--accent); color: #fff; font-size: 16px; font-weight: 800; box-shadow: 0 4px 0 var(--accent-press); }
	.big:disabled { opacity: 0.5; }
	.big.alt { background: var(--panel-2); color: var(--text); box-shadow: none; border: 1px solid var(--border); }
	.ghost { display: block; min-height: 44px; margin-top: 12px; background: none; border: 0; color: var(--muted); font-size: 15px; text-decoration: underline; text-align: center; width: 100%; }
	.tiers { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 10px; }
	.tier { min-height: 56px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel-2); text-align: left; }
	.tier b { display: block; font-size: 16px; }
	.tier span { font-size: 13px; color: var(--muted); }
	.tier:disabled { opacity: 0.45; }
	.bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
	.bar .ghost { width: auto; margin: 0; }
	.chain, .line { list-style: none; padding: 0; margin: 12px 0; display: flex; flex-direction: column; gap: 6px; }
	.chain li, .line li { align-self: flex-start; max-width: 85%; padding: 8px 12px; border-radius: 14px; background: var(--panel-2); overflow-wrap: anywhere; }
	.chain li.me, .line li.me { align-self: flex-end; background: var(--accent); color: #fff; }
	.chain li span, .line li span { display: block; font-size: 13px; opacity: 0.85; margin-top: 2px; }
	/* 진행 중은 한 화면 — 지난 말은 위에 한 줄(최근 여섯), 지금 말은 가운데 크게, 입력은 그 아래. 전체 흐름은 판 끝에 */
	.prog { height: 6px; margin-top: 8px; border-radius: 3px; background: var(--panel-2); overflow: hidden; }
	.prog i { display: block; height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.3s; }
	.trail { list-style: none; padding: 0; margin: 16px auto 0; width: max-content; max-width: 100%; display: flex; justify-content: flex-end; align-items: center; gap: 4px; min-height: 28px; overflow: hidden; font-size: 13px; color: var(--muted); white-space: nowrap; }
	.trail li { flex: none; padding: 3px 8px; border-radius: 10px; background: var(--panel-2); }
	.trail li.me { color: var(--accent); font-weight: 700; }
	.trail li.more { background: none; padding: 0; }
	.trail:has(.more) { -webkit-mask-image: linear-gradient(to right, transparent, #000 32px); mask-image: linear-gradient(to right, transparent, #000 32px); } /* 좁으면 오래된 쪽(왼쪽)이 잘린다 — 최근 말은 늘 다 보인다 */
	.now { margin-top: 14px; padding: 22px 12px 26px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--panel); text-align: center; scroll-margin: 12px; }
	.now span { display: block; font-size: 13px; font-weight: 800; color: var(--muted); }
	.now b { display: block; margin-top: 6px; font-size: clamp(30px, 11vw, 44px); font-weight: 900; line-height: 1.2; overflow-wrap: anywhere; }
	.now u { color: var(--accent); text-decoration: underline; text-decoration-color: var(--accent); text-decoration-thickness: 4px; text-underline-offset: 8px; }
	.end h3 { font-size: 15px; font-weight: 800; margin-top: 16px; color: var(--muted); }
	.dock { position: sticky; bottom: var(--tab-h, 0px); padding: 12px 0 8px; background: var(--bg); }
	form { display: flex; gap: 8px; }
	form input { flex: 1; min-width: 0; min-height: 48px; padding: 0 12px; border: 1px solid var(--border); border-radius: 12px; font-size: 17px; background: var(--panel); color: var(--text); }
	form .big { width: auto; margin: 0; padding: 0 18px; }
	.msg { color: var(--danger); font-weight: 700; margin-top: 8px; word-break: keep-all; }
	.msg:empty { margin: 0; }
	.row { display: flex; gap: 8px; }
	.row .big { flex: 1; }
	.toast { position: fixed; bottom: calc(24px + var(--tab-h, 0px)); left: 50%; transform: translateX(-50%); width: max-content; max-width: calc(100vw - 32px); background: var(--text); color: #fff; border-radius: 12px; padding: 12px 20px; font-size: 14px; z-index: 30; box-shadow: 0 8px 30px rgba(44, 40, 34, 0.3); }
	.end { margin-top: 12px; }
	.end a.ghost { margin-top: 8px; }
	.src { margin-top: 28px; font-size: 12px; color: var(--muted-2); line-height: 1.6; }
	.src a { color: inherit; }
</style>
