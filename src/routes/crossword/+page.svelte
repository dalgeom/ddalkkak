<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { dev, version } from '$app/environment';
	import { track } from '$lib/analytics';
	import { kstDayNumber } from '$lib/game';
	import { parseGrid, canOpenDay, cleanEntry, type Grid, type Word } from '$lib/crossword';
	import { CROSSWORD_FIRST_DAY, crosswordFor, dateOf, type CrosswordPuzzle } from '$lib/data/crosswordPuzzles';
	import { nextStreak, shownStreak, type DayStreak } from '$lib/dailyStreak';
	import DailyNext from '$lib/components/DailyNext.svelte';
	import { shareResult as shareCardResult, outcomeMessage } from '$lib/shareCard';

	/*
	 * 오늘의 가로세로 낱말퍼즐(2026-11-17) — 5×5 판 하나를 매일. 낱말을 통째로 써 넣는다.
	 * 판 · 열쇠는 crosswordPuzzles.ts, 뜻풀이는 끝말잇기와 같은 사전 조각(/kkeut/defs)을 다 푼 뒤에만 받는다.
	 * 설계: docs/superpowers/specs/2026-11-17-crossword-design.md
	 */
	const DAILY_KEY = 'ddal.cw.daily';
	type Saved = { cells: string[]; opened: number[]; hints: number; start: number; sec: number; done: boolean };

	let realToday = 0;
	let day = $state(0);
	let puzzle = $state<CrosswordPuzzle | null>(null);
	let g = $state.raw<Grid | null>(null);
	let cells = $state<string[]>(Array(25).fill(''));
	let opened = $state<number[]>([]); // 글자 열기로 연 칸 — 다시 써도 바뀌지 않는다
	let wrong = $state<number[]>([]);
	let hints = $state(0);
	let start = $state(0);
	let sec = $state(0);
	let done = $state(false);
	let sel = $state(0); // g.words 안의 번호
	let input = $state('');
	let msg = $state('');
	let streak = $state<DayStreak | null>(null);
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
	const key = () => `ddal.cw.${puzzle?.date}`;
	const save = () => write(key(), { cells, opened, hints, start, sec, done } satisfies Saved);

	onMount(() => {
		realToday = kstDayNumber(Date.now());
		const q = Number(new URL(location.href).searchParams.get('day'));
		day = q && canOpenDay(q, realToday, dev) ? q : realToday;
		puzzle = crosswordFor(day);
		streak = read<DayStreak>(DAILY_KEY);
		if (!puzzle) return;
		g = parseGrid(puzzle.rows);
		const s = read<Saved>(key());
		if (s) ({ cells, opened, hints, start, sec, done } = s);
		if (done) loadDefs(g.words.map((w) => w.answer));
	});

	let word = $derived<Word | null>(g?.words[sel] ?? null);
	let across = $derived(g ? g.words.map((w, i) => ({ w, i })).filter((x) => x.w.dir === 'across') : []);
	let down = $derived(g ? g.words.map((w, i) => ({ w, i })).filter((x) => x.w.dir === 'down') : []);
	const filled = (w: Word) => w.cells.every((i) => cells[i]);
	const dirName = (w: Word) => (w.dir === 'across' ? '가로' : '세로');
	// 해설 쪽은 빌드 날짜 기준 어제까지만 굽는다(answer/[date]) — 그보다 앞날을 가리키면 404라 빌드 날짜로 묶는다
	const built = kstDayNumber(Number(version));
	let ansDay = $derived(Math.min(day || built, built) - 1);

	async function choose(i: number, focus = true) {
		sel = i;
		msg = '';
		if (focus) {
			await tick();
			field?.focus({ preventScroll: true });
		}
	}

	/** 칸을 누르면 그 칸의 낱말을 고른다. 고른 낱말의 칸을 다시 누르면 반대 방향으로 */
	function tapCell(i: number) {
		if (!g || g.black[i] || done) return;
		const mine = g.words.map((w, k) => ({ w, k })).filter((x) => x.w.cells.includes(i));
		const cur = mine.findIndex((x) => x.k === sel);
		choose(mine[cur >= 0 ? (cur + 1) % mine.length : 0].k);
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!g || !word || done) return;
		const t = cleanEntry(input);
		if (!t) {
			msg = '한글 낱말로 써 주세요.';
			return;
		}
		if (t.length !== word.cells.length) {
			msg = `${word.cells.length}글자예요.`;
			return;
		}
		if (!start) {
			start = Date.now();
			track('cw_start', { date: puzzle!.date });
		}
		const next = [...cells];
		word.cells.forEach((c, k) => {
			if (!opened.includes(c)) next[c] = t[k];
		});
		cells = next;
		wrong = wrong.filter((c) => !word!.cells.includes(c));
		input = '';
		msg = '';
		check();
		save();
		if (!done) {
			const rest = g.words.findIndex((w, k) => k > sel && !filled(w));
			const any = g.words.findIndex((w) => !filled(w));
			if (rest >= 0 || any >= 0) choose(rest >= 0 ? rest : any);
		}
	}

	function check() {
		if (!g) return;
		const whites = g.black.flatMap((b, i) => (b ? [] : [i]));
		if (whites.some((i) => !cells[i])) return;
		wrong = whites.filter((i) => cells[i] !== g!.chars[i]);
		if (wrong.length) {
			msg = `틀린 칸이 ${wrong.length}개 있어요. 빨간 칸이 든 낱말을 다시 써 보세요.`;
			return;
		}
		done = true;
		sec = Math.round((Date.now() - (start || Date.now())) / 1000);
		track('cw_complete', { date: puzzle!.date, sec, hints });
		if (day === realToday || dev) {
			streak = nextStreak(streak, day, 'won');
			write(DAILY_KEY, streak);
		}
		loadDefs(g.words.map((w) => w.answer));
		tick().then(() => document.getElementById('cw-end')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
	}

	/** 고른 낱말에서 비었거나 틀린 칸 하나를 연다 */
	function openOne() {
		if (!g || !word || done) return;
		const c = word.cells.find((i) => !opened.includes(i) && cells[i] !== g!.chars[i]);
		if (c === undefined) {
			msg = '이 낱말은 열 칸이 없어요.';
			return;
		}
		if (!start) start = Date.now();
		hints++;
		opened = [...opened, c];
		const next = [...cells];
		next[c] = g.chars[c];
		cells = next;
		wrong = wrong.filter((x) => x !== c);
		track('cw_hint', { date: puzzle!.date, hints });
		msg = '';
		check();
		save();
	}

	async function loadDefs(words: string[]) {
		const cho = (w: string) => Math.floor((w.charCodeAt(0) - 0xac00) / 588);
		const need = [...new Set(words.map(cho))];
		const parts = await Promise.all(need.map((n) => fetch(`/kkeut/defs/${n}.json`).then((r) => r.json()).catch(() => ({}))));
		const out: Record<string, string> = {};
		for (const w of words) for (const p of parts) if (p[w]) out[w] = p[w];
		defs = { ...defs, ...out };
	}

	const clock = (s: number) => `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`;
	/** 공유용 격자 — 검은 칸 ⬛, 내가 맞힌 칸 🟩, 글자 열기로 연 칸 🟨. 답 글자는 적지 않는다 */
	const emojiGrid = () =>
		g ? Array.from({ length: 5 }, (_, r) => g!.black.slice(r * 5, r * 5 + 5).map((b, c) => (b ? '⬛' : opened.includes(r * 5 + c) ? '🟨' : '🟩')).join('')) : [];

	let toastMsg = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;
	async function share() {
		const n = streak?.streak ?? 1;
		const sub = hints ? `글자 열기 ${hints}번` : '글자 열기 없이';
		const rows = emojiGrid();
		const text = `딸깍! 오늘의 낱말퍼즐 · ${clock(sec)} · ${sub}\n${rows.join('\n')}\n${location.origin}/crossword?ref=crossword\n#딸깍`;
		const m = outcomeMessage(
			await shareCardResult({ title: '오늘의 가로세로 낱말퍼즐', scoreLabel: clock(sec), emojiRow: rows.join(' '), subLine: `${sub} · 🔥 ${n}일 연속`, cta: '너도 도전해봐!' }, text)
		);
		if (!m) return;
		toastMsg = m;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2200);
	}
</script>

<svelte:head>
	<title>오늘의 가로세로 낱말퍼즐 — 매일 새 5×5 퍼즐 | 딸깍</title>
	<meta
		name="description"
		content="매일 하나씩 열리는 5×5 가로세로 낱말퍼즐. 열쇠를 읽고 낱말을 통째로 써 넣어요. 낱말은 국립국어원 한국어기초사전의 쉬운 말에서 골랐어요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/crossword" />
	<meta property="og:title" content="오늘의 가로세로 낱말퍼즐 | 딸깍" />
	<meta property="og:description" content="매일 새 5×5 낱말퍼즐. 열쇠를 읽고 낱말을 써 넣어요." />
	<meta property="og:url" content="https://ddalkkak.app/crossword" />
</svelte:head>

<div class="kroot">
	<header class="cover">
		<h1><span class="kicker">가로세로 낱말퍼즐</span>오늘의 <b>낱말퍼즐</b></h1>
		<p class="lead">열쇠를 읽고 낱말을 통째로 써 넣어요. 매일 자정에 새 판.</p>
	</header>

	{#if day && !puzzle}
		<section class="card">
			<h2>{day < CROSSWORD_FIRST_DAY ? '첫 퍼즐은 11월 17일에 열려요' : '오늘 퍼즐을 준비하고 있어요'}</h2>
			<p class="note">그동안 오늘의 10문제나 끝말잇기를 풀어 보세요.</p>
			<a class="big link" href="/kkeut">끝말잇기 하러 가기</a>
		</section>
	{:else if g && puzzle}
		<section class="card today">
			<div class="top">
				<span class="kicker">{puzzle.date.slice(5).replace('-', '월 ')}일 · 낱말 {g.words.length}개</span>
				{#if shownStreak(streak, day) > 0}<span class="streak">🔥 {shownStreak(streak, day)}일 연속</span>{/if}
				{#if !done}<button class="hint" type="button" onclick={openOne}>글자 하나 열기</button>{/if}
			</div>
			<div class="grid" role="grid" aria-label="5×5 낱말퍼즐 판">
				{#each g.chars as _, i (i)}
					{#if g.black[i]}
						<span class="cell black" aria-hidden="true"></span>
					{:else}
						<button
							type="button"
							class="cell"
							class:on={word?.cells.includes(i)}
							class:wrong={wrong.includes(i)}
							class:opened={opened.includes(i)}
							aria-label="{Math.floor(i / 5) + 1}행 {(i % 5) + 1}열 {cells[i] || '빈 칸'}"
							onclick={() => tapCell(i)}
						>
							{#if g.numbers[i]}<small>{g.numbers[i]}</small>{/if}{cells[i]}
						</button>
					{/if}
				{/each}
			</div>
		</section>

		{#if done}
			<section class="card end" id="cw-end">
				<h2>다 풀었어요!</h2>
				<p class="score">{clock(sec)} · {hints ? `글자 열기 ${hints}번` : '글자 열기 없이'}</p>
				<button class="big" type="button" onclick={share}>결과 공유하기</button>
				<h3>오늘의 낱말 뜻풀이</h3>
				<ul class="words">
					{#each g.words as w (w.num + w.dir)}
						<li><b>{w.num} {dirName(w)} · {w.answer}</b>{#if defs[w.answer]}<span>{defs[w.answer]}</span>{/if}</li>
					{/each}
				</ul>
				{#if ansDay >= CROSSWORD_FIRST_DAY}
					<a class="ghost" href="/crossword/answer/{dateOf(ansDay)}">어제 퍼즐 정답과 해설 보기</a>
				{/if}
			</section>
			<DailyNext pitch="오늘의 10문제도 풀어 보세요" />
		{:else}
			<section class="card clues">
				<h2>가로 열쇠</h2>
				<ol>
					{#each across as { w, i } (i)}
						<li><button type="button" class:on={sel === i} class:full={filled(w)} onclick={() => choose(i)}><b>{w.num}</b> {puzzle.clues[w.answer]} <em>({w.cells.length}글자)</em></button></li>
					{/each}
				</ol>
				<h2>세로 열쇠</h2>
				<ol>
					{#each down as { w, i } (i)}
						<li><button type="button" class:on={sel === i} class:full={filled(w)} onclick={() => choose(i)}><b>{w.num}</b> {puzzle.clues[w.answer]} <em>({w.cells.length}글자)</em></button></li>
					{/each}
				</ol>
			</section>
		{/if}
	{/if}

	<section class="card rules">
		<h2>어떻게 푸나요</h2>
		<p class="note">
			판의 흰 칸을 누르거나 아래 열쇠를 누르면 그 낱말이 골라져요. 같은 칸을 한 번 더 누르면 가로와 세로가 바뀌어요. 열쇠를 읽고 떠오른
			낱말을 아래 칸에 통째로 써 넣으면 판에 들어가요. 가로 낱말과 세로 낱말은 글자 하나를 나눠 쓰니, 쉬운 낱말부터 채우면 엇갈리는 칸이
			다음 낱말의 실마리가 돼요.
		</p>
		<p class="note">
			판이 다 차면 맞는지 봐 드려요. 틀린 칸은 빨갛게 보이니 그 칸이 든 낱말을 다시 써 보세요. 도저히 막히면 「글자 하나 열기」로 고른
			낱말의 한 칸을 열 수 있어요. 연 칸은 결과에 노란 칸으로 남아요. 낱말은 모두 국립국어원 한국어기초사전에 실린 쉬운 명사에서 골랐고,
			다 풀면 사전 뜻풀이를 함께 보여 드려요.
		</p>
	</section>

	{#if g && !done}
		<div class="dock">
			{#if word && puzzle}<p class="cur"><b>{word.num} {dirName(word)}</b> {puzzle.clues[word.answer]} <em>({word.cells.length}글자)</em></p>{/if}
			<form onsubmit={submit}>
				<input
					bind:this={field}
					bind:value={input}
					placeholder={word ? `${word.cells.length}글자 낱말` : '낱말'}
					aria-label="낱말 입력"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					enterkeyhint="send"
				/>
				<button class="big" type="submit" onpointerdown={(e) => e.preventDefault()}>넣기</button>
			</form>
			<p class="msg" aria-live="assertive">{msg}</p>
		</div>
	{/if}

	{#if toastMsg}<div class="toast" role="status">{toastMsg}</div>{/if}

	<p class="src">
		낱말과 뜻풀이: <a href="https://krdict.korean.go.kr" rel="noopener">한국어기초사전(국립국어원)</a>,
		<a href="https://creativecommons.org/licenses/by-sa/2.0/kr/" rel="noopener">CC BY-SA 2.0 KR</a> ·
		<a href="/kkeut/LICENSE.txt">목록 파일 안내</a>
	</p>
</div>

<style>
	.kroot { padding-bottom: 20px; }
	.cover h1 { font-size: 28px; line-height: 1.25; margin: 6px 0 8px; }
	.cover h1 .kicker { display: block; }
	.kicker { font-size: 13px; font-weight: 800; color: var(--accent); }
	.lead, .note { color: var(--muted); font-size: 15px; line-height: 1.6; word-break: keep-all; }
	.note + .note { margin-top: 8px; }
	.card { margin-top: 14px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--panel); }
	.card h2 { font-size: 18px; font-weight: 900; margin-bottom: 6px; }
	.top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.streak { font-size: 13px; font-weight: 800; }
	/* 아래 입력창(약 170px)과 머리 · 하단 탭을 뺀 높이 안에 판이 다 보이게 — 작은 폰에서도 220px 아래로는 안 줄인다 */
	.grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; width: min(100%, 340px, calc(100svh - 430px)); min-width: 220px; margin: 8px auto 0; }
	.cell {
		position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
		border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);
		font-size: clamp(20px, 7vw, 28px); font-weight: 900; padding: 0;
	}
	.cell small { position: absolute; top: 2px; left: 4px; font-size: 11px; font-weight: 700; color: var(--muted); }
	.cell.black { background: var(--text); border-color: var(--text); }
	.cell.on { background: var(--panel-2); border-color: var(--accent); }
	.cell.opened { color: #b7791f; }
	.cell.wrong { border-color: var(--danger); color: var(--danger); }
	.clues ol { list-style: none; padding: 0; margin: 0 0 12px; }
	.clues li + li { margin-top: 4px; }
	.clues button {
		display: block; width: 100%; min-height: 44px; padding: 8px 10px; text-align: left; border: 1px solid transparent;
		border-radius: 10px; background: none; color: var(--text); font-size: 15px; line-height: 1.5; word-break: keep-all;
	}
	.clues button.on { border-color: var(--accent); background: var(--panel-2); }
	.clues button.full { color: var(--muted); }
	.clues em, .cur em { font-style: normal; color: var(--muted); font-size: 13px; }
	.big { display: block; width: 100%; min-height: 48px; margin-top: 12px; border: 0; border-radius: 14px; background: var(--accent); color: #fff; font-size: 16px; font-weight: 800; box-shadow: 0 4px 0 var(--accent-press); }
	a.big { display: flex; align-items: center; justify-content: center; text-decoration: none; }
	.ghost { display: block; min-height: 44px; margin-top: 12px; background: none; border: 0; color: var(--muted); font-size: 15px; text-decoration: underline; text-align: center; width: 100%; line-height: 44px; }
	.end .score { font-size: 20px; font-weight: 900; }
	.end h3 { font-size: 15px; font-weight: 800; margin-top: 16px; color: var(--muted); }
	.words { list-style: none; padding: 0; margin: 8px 0 0; }
	.words li + li { margin-top: 8px; }
	.words li span { display: block; font-size: 13px; color: var(--muted); margin-top: 2px; line-height: 1.5; }
	.dock { position: sticky; bottom: var(--tab-h, 0px); padding: 8px 0 6px; background: var(--bg); }
	.cur { font-size: 15px; line-height: 1.5; margin-bottom: 8px; word-break: keep-all; }
	form { display: flex; gap: 8px; }
	form input { flex: 1; min-width: 0; min-height: 48px; padding: 0 12px; border: 1px solid var(--border); border-radius: 12px; font-size: 17px; background: var(--panel); color: var(--text); }
	form .big { width: auto; margin: 0; padding: 0 18px; }
	.hint { min-height: 36px; margin-left: auto; padding: 0 4px; background: none; border: 0; color: var(--muted); font-size: 14px; text-decoration: underline; }
	.msg { color: var(--danger); font-weight: 700; margin-top: 8px; word-break: keep-all; }
	.msg:empty { margin: 0; }
	.toast { position: fixed; bottom: calc(24px + var(--tab-h, 0px)); left: 50%; transform: translateX(-50%); background: var(--text); color: #fff; border-radius: 12px; padding: 12px 20px; z-index: 30; }
	.src { margin-top: 28px; font-size: 12px; color: var(--muted-2); line-height: 1.6; }
</style>
