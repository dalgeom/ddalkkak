<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { dev, version } from '$app/environment';
	import { track } from '$lib/analytics';
	import { kstDayNumber } from '$lib/game';
	import { TIERS, tierName, type Tier } from '$lib/tiers';
	import { charTable, makeDict, last, type Dict, type Reject, type Table } from '$lib/kkeut';
	import { firstWord, giveUp, newDuel, newPuzzle, play, DUEL_LIMIT, type Game } from '$lib/kkeutGame';
	import { KKEUT_FIRST_DAY, puzzleFor, type KkeutPuzzle } from '$lib/data/kkeutPuzzles';
	import { nextStreak, shownStreak, type DayStreak } from '$lib/dailyStreak';
	import { KKEUT_WORDS } from '$lib/data/kkeutMeta';

	/*
	 * 끝말잇기(2026-11-03) — 오늘의 퍼즐(N수 안에 컴퓨터 막기)과 컴퓨터 대결 5단계.
	 * 사전(static/kkeut/words.json)은 이 화면에서만 받는다. 뜻풀이는 판 끝에 그 판에 나온 말의 조각만 받는다.
	 * 설계: docs/superpowers/specs/2026-11-03-kkeut-design.md
	 */
	const DAILY_KEY = 'ddal.kkeut.daily';
	const TIER_KEY = 'ddal.kkeut.tier';
	const TRIES_KEY = 'ddal.kkeut.tries';
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
	let game = $state<Game | null>(null);
	let tries = $state(0);
	let hint = $state(false);
	let input = $state('');
	let msg = $state('');
	let giveHints: string[] = $state([]);
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

	function startPuzzle() {
		if (!puzzle) return;
		game = newPuzzle(puzzle.start, pn, puzzle.line);
		msg = '';
		track('kkeut_daily_start', { n: game.n });
		focus();
	}
	function startDuel(tier: Tier) {
		if (!dict || !table) return;
		game = newDuel(tier, firstWord(dict, table, tier));
		msg = '';
		giveHints = [];
		track('kkeut_duel_start', { tier });
		focus();
	}
	const focus = () => setTimeout(() => field?.focus(), 50);
	/** 긴 판에서 새 말 · 거절 문구가 화면 밖으로 밀리지 않게 마지막 말을 입력창 위로 — 판이 끝났으면 결과(.end)를 */
	async function toEnd() {
		await tick();
		(document.querySelector('.end') ?? document.querySelector('.chain li:last-child'))?.scrollIntoView({ block: 'nearest' });
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

	function quit() {
		if (!game || !dict) return;
		giveHints = giveUp(game, dict);
		track('kkeut_duel_giveup', { tier: game.tier, moves: mineCount });
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

	function back() {
		// 퍼즐을 한 수라도 둔 뒤 나가면 한 번 놓친 것 — 질 것 같을 때 나갔다 다시 들어오는 길을 막는다
		if (game?.mode === 'puzzle' && !game.end && mineCount > 0) miss();
		game = null;
		input = '';
		msg = '';
		giveHints = [];
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
			<span class="kicker">끝말잇기</span>
			<h1>컴퓨터와<br /><b>끝말잇기</b></h1>
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
				컴퓨터가 {DUEL_LIMIT}번 받아칠 때까지 버티면 이겨요. 새싹 · 쉬움은 쉬운 낱말만 쓰고, 새싹은 받아칠 말이 없는 「한방 단어」를 되도록 내지 않아요.
				보통부터는 사전 전체를 쓰고, 어려움은 한방 단어를 먼저 노리고, 고수는 수를 읽어 가장 받기 어려운 말을 골라요.
			</p>
		</section>
	{:else}
		<div class="playing">
			<div class="bar">
				<button class="ghost" onclick={back}>← 나가기</button>
				<span>{game.mode === 'puzzle' ? `오늘의 퍼즐 · ${mineCount}/${game.n}수` : `${tierName(game.tier)} · ${mineCount}/${DUEL_LIMIT}`}</span>
			</div>
			<ol class="chain">
				{#each game.chain as x, i (i)}
					<li class:me={x.who === 'me'}><b>{x.word}</b>{#if game.end && defs[x.word]}<span>{defs[x.word]}</span>{/if}</li>
				{/each}
			</ol>

			{#if !game.end}
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
							placeholder="「{last(game.chain[game.chain.length - 1].word)}」(으)로 시작하는 말"
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
				{#if game.mode === 'duel'}<button class="ghost" onclick={quit}>모르겠어요</button>{/if}
			{:else}
				<section class="end">
					{#if game.mode === 'puzzle'}
						<h2>{game.end === 'win' ? '막았어요!' : '컴퓨터가 받아쳤어요'}</h2>
						{#if game.end === 'win'}
							<button class="big" onclick={back}>처음으로</button>
						{:else if tries < 3}
							<button class="big" onclick={startPuzzle}>다시 풀기 ({3 - tries}번 남음)</button>
						{:else}
							<p class="note">세 번 놓쳐서 정답 길을 보여 드려요.</p>
							<button class="big" onclick={back}>정답 길 보기</button>
						{/if}
						{#if answer}<a class="ghost" href="/kkeut/answer/{answer.date}" onclick={() => track('kkeut_answer_open', { from: 'end' })}>어제 퍼즐 해설 보기</a>{/if}
					{:else}
						<h2>{game.end === 'win' ? `${tierName(game.tier)} 단계를 이겼어요!` : game.end === 'lose' ? '이을 말이 없어요, 졌어요' : '이런 말이 있었어요'}</h2>
						{#if giveHints.length}<p class="note">{giveHints.join(' · ')}</p>{/if}
						<div class="row">
							<button class="big" onclick={() => game && startDuel(game.tier)}>다시 하기</button>
							{#if game.end === 'win' && game.tier < 5}<button class="big alt" onclick={() => game && startDuel((game.tier + 1) as Tier)}>다음 단계</button>{/if}
						</div>
						<button class="ghost" onclick={back}>오늘의 퍼즐 · 다른 단계</button>
					{/if}
					<a class="ghost" href="/games">다른 놀이</a>
				</section>
			{/if}
		</div>
	{/if}

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
	.chain li { scroll-margin: 12px 0 calc(var(--tab-h, 0px) + 120px); } /* 아래 sticky 입력 묶음 · 하단 탭에 가리지 않게 */
	.chain li.me, .line li.me { align-self: flex-end; background: var(--accent); color: #fff; }
	.chain li span, .line li span { display: block; font-size: 13px; opacity: 0.85; margin-top: 2px; }
	.dock { position: sticky; bottom: var(--tab-h, 0px); padding: 8px 0; background: var(--bg); }
	form { display: flex; gap: 8px; }
	form input { flex: 1; min-width: 0; min-height: 48px; padding: 0 12px; border: 1px solid var(--border); border-radius: 12px; font-size: 17px; background: var(--panel); color: var(--text); }
	form .big { width: auto; margin: 0; padding: 0 18px; }
	.msg { color: var(--danger); font-weight: 700; margin-top: 8px; word-break: keep-all; }
	.msg:empty { margin: 0; }
	.row { display: flex; gap: 8px; }
	.row .big { flex: 1; }
	.end { margin-top: 12px; }
	.end a.ghost { margin-top: 8px; }
	.src { margin-top: 28px; font-size: 12px; color: var(--muted-2); line-height: 1.6; }
	.src a { color: inherit; }
</style>
