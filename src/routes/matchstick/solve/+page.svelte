<script lang="ts">
	import { afterNavigate, replaceState } from '$app/navigation';
	import { track } from '$lib/analytics';
	import MatchEquation from '$lib/components/MatchEquation.svelte';
	import { MATCH_TOTAL } from '$lib/game';
	import type { MatchRule } from '$lib/matchstick';
	import {
		MAX_LEN,
		RULES,
		RULE_LABEL,
		changeLine,
		isTrueText,
		parseCells,
		pretty,
		solve,
		type Cell,
		type Solution
	} from '$lib/matchSolve';

	/*
	 * 성냥 정답 찾기(2026-10-21). 네이버에서 「12-7=6 성냥 한개만 옮겨서」처럼 식을 치고 들어온 사람은
	 * 그 식의 답을 찾으러 왔는데, 착지 화면에는 오늘의 성냥이 떠 있었다(9/21~10/21 네이버 → 성냥 착지
	 * 약 210명 중 오늘의 성냥 시작 27%). 아무 식이나 넣으면 답을 보여 주고, 다 보면 우리 문제로 잇는다.
	 * 프리렌더 쪽이라 주소의 ?q=식&r=규칙은 화면이 뜬 뒤(afterNavigate) 읽는다.
	 */

	/** 실제로 검색해 들어온 식들(9~10월 네이버 블로그 · 사이트 유입 검색어) — 각 식에 답이 있는 첫 규칙 */
	const EXAMPLES = ['12-7=6', '10+3=18', '8-2=8', '9-9=5', '9+5=9', '8+9=10', '41-9=5', '6-6=8', '8+3=6', '9-6=8'].map((q) => {
		const cells = (parseCells(q) as { cells: Cell[] }).cells;
		const rule = RULES.find((r) => solve(cells, r).length)!;
		return { q, rule, answers: solve(cells, rule).map((s) => s.text) };
	});

	/** 규칙 설명 — 예제 답은 matchSolve.test.ts가 풀이기와 맞춰 본다 */
	const RULE_NOTES: { rule: MatchRule; what: string; ex: string }[] = [
		{ rule: 'move1', what: '성냥 하나를 빼서 다른 자리에 꽂아요. 판 위 성냥 수는 그대로예요. 가장 흔한 문제예요.', ex: '6 + 4 = 4 → 0 + 4 = 4 또는 8 − 4 = 4' },
		{ rule: 'move2', what: '성냥 둘을 옮겨요. 한 숫자에서 둘을 빼 다른 숫자에 붙이기도 하고, 두 군데를 따로 고치기도 해요.', ex: '41 − 9 = 5 → 14 − 9 = 5 (4와 1이 성냥 둘을 주고받아요)' },
		{ rule: 'remove1', what: '성냥 하나를 빼기만 해요. 숫자에서 획이 하나 줄거나 + 가 − 가 돼요.', ex: '8 + 3 = 5 → 8 − 3 = 5' },
		{ rule: 'add1', what: '성냥 하나를 더 놓기만 해요. 숫자에 획이 하나 늘거나 − 가 + 가 돼요.', ex: '7 + 1 = 0 → 7 + 1 = 8' }
	];

	const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '=', '⌫'];

	let input = $state('');
	let rule = $state<MatchRule>('move1');

	type Result =
		| { kind: 'found'; text: string; cells: Cell[]; rule: MatchRule; list: Solution[] }
		| {
				kind: 'none' | 'already';
				text: string;
				cells: Cell[];
				rule: MatchRule;
				shown?: { rule: MatchRule; list: Solution[] };
				others: { rule: MatchRule; n: number }[];
		  };
	let result = $state<Result | null>(null);
	let resultEl = $state<HTMLElement>();

	const parsed = $derived(input ? parseCells(input) : null);
	const preview = $derived(parsed && 'cells' in parsed ? parsed : null);
	// 쓰는 중인 모양(= 가 아직 없음 등)은 「정답 찾기」를 누른 뒤에만 말한다 — 치는 동안 빨간 글이 뜨면 틀린 줄 안다
	let tried = $state(false);
	const error = $derived(parsed && 'error' in parsed && (!parsed.unfinished || tried) ? parsed.error : '');
	$effect(() => {
		void input;
		tried = false;
	});

	// 식이나 규칙을 바꾸면 지난 답은 거둔다 — 남겨 두면 새 식의 답처럼 읽힌다
	$effect(() => {
		const now = preview?.text ?? '';
		if (result && (result.text !== now || result.rule !== rule)) result = null;
	});

	function run(from: 'button' | 'example' | 'link' | 'alt' = 'button') {
		const p = parseCells(input);
		if ('error' in p) {
			track('msolve_bad');
			tried = true;
			return;
		}
		// 주소로 열었을 때는 이미 주소에 식이 있다(첫 진입의 afterNavigate에서는 라우터가 아직이라 replaceState가 예외를 낸다)
		if (from !== 'link') replaceState(`/matchstick/solve?q=${encodeURIComponent(p.text)}&r=${rule}`, {});
		if (from === 'example') track('msolve_example');
		if (from === 'alt') track('msolve_alt');
		track('msolve_run');
		const others = () =>
			RULES.filter((r) => r !== rule)
				.map((r) => ({ rule: r, list: solve(p.cells, r) }))
				.filter((o) => o.list.length);
		if (isTrueText(p.text)) {
			track('msolve_already');
			result = { kind: 'already', text: p.text, cells: p.cells, rule, others: [] };
		} else {
			const list = solve(p.cells, rule);
			if (list.length) {
				track('msolve_found');
				result = { kind: 'found', text: p.text, cells: p.cells, rule, list };
			} else {
				track('msolve_none');
				// 답이 있는 첫 규칙의 답은 바로 펼친다(10/28) — 10/27에 한 사람이 5+9=3을 1개 옮기기로 26번 눌렀다.
				// 다시 눌러도 같은 「답 없음」이라 반응이 없는 줄 알았고, 아래 「2개 옮기기 · 답 5개 보기」는 끝내 안 눌렀다
				const [first, ...rest] = others();
				if (first) track('msolve_none_shown');
				result = {
					kind: 'none',
					text: p.text,
					cells: p.cells,
					rule,
					shown: first,
					others: rest.map((o) => ({ rule: o.rule, n: o.list.length }))
				};
			}
		}
		// 예시 단추는 우리가 고른 식이라 「많이 찾는 식」에 넣지 않는다(api/msolve)
		if (from !== 'example') {
			const found = result?.kind !== 'none';
			fetch('/api/msolve', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ text: p.text, rule, found })
			}).catch(() => {});
		}
		requestAnimationFrame(() => resultEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
	}

	function press(k: string) {
		if (k === '⌫') input = input.slice(0, -1);
		else if (input.length < MAX_LEN) input += k;
	}

	function pickExample(e: MouseEvent, q: string, r: MatchRule) {
		e.preventDefault();
		input = q;
		rule = r;
		run('example');
	}

	function tryRule(r: MatchRule) {
		rule = r;
		run('alt');
	}

	afterNavigate(({ to }) => {
		const q = to?.url.searchParams.get('q');
		if (!q) return;
		const r = to?.url.searchParams.get('r') as MatchRule | null;
		input = q;
		if (r && RULES.includes(r)) rule = r;
		run('link');
	});
</script>

<svelte:head>
	<title>성냥개비 문제 정답 찾기 — 식을 넣으면 답을 알려 드려요 | 딸깍 퍼즐</title>
	<meta
		name="description"
		content="어디서 본 성냥개비 문제든 식을 그대로 넣으면 답을 찾아 드려요. 성냥 1개 옮기기, 2개 옮기기, 1개 빼기, 1개 더하기. 두 자리 수도 되고, 어느 성냥을 어디로 옮기는지 그림으로 보여 줘요."
	/>
	<link rel="canonical" href="https://ddalkkak.app/matchstick/solve" />
	<meta property="og:title" content="성냥개비 문제 정답 찾기 | 딸깍 퍼즐" />
	<meta property="og:description" content="식을 넣으면 성냥을 어디로 옮기는지 그림으로 보여 줘요." />
	<meta property="og:url" content="https://ddalkkak.app/matchstick/solve" />
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/matchstick">성냥개비</a><span aria-hidden="true">›</span><span>정답 찾기</span>
		</nav>
		<h1>성냥개비 문제<br /><b>정답 찾기</b></h1>
		<p class="lead">
			어디서 본 문제든 식을 그대로 넣어 보세요. 성냥을 옮겨 맞는 식이 되는 답을 모두 찾고, 어느 성냥을 어디로
			옮기는지 그림으로 보여 드려요.
		</p>
	</header>

	<section class="tool" aria-label="정답 찾기">
		<label class="lbl" for="eq">문제 식</label>
		<input
			id="eq"
			class="eq"
			class:bad={!!error}
			class:long={input.length > 11}
			bind:value={input}
			inputmode="none"
			autocomplete="off"
			spellcheck="false"
			maxlength={MAX_LEN + 6}
			placeholder="예: 12-7=6"
			onkeydown={(e) => e.key === 'Enter' && run()}
		/>
		<div class="keys">
			{#each KEYS as k (k)}
				<button
					type="button"
					class="key"
					class:sym={k === '+' || k === '-' || k === '=' || k === '⌫'}
					aria-label={k === '⌫' ? '한 글자 지우기' : k === '-' ? '빼기' : undefined}
					onclick={() => press(k)}>{k === '-' ? '−' : k}</button
				>
			{/each}
		</div>

		<span class="lbl">규칙</span>
		<div class="rules" role="radiogroup" aria-label="규칙">
			{#each RULES as r (r)}
				<button type="button" role="radio" aria-checked={rule === r} class="rule" class:on={rule === r} onclick={() => (rule = r)}>
					{RULE_LABEL[r]}
				</button>
			{/each}
		</div>

		{#if preview}
			<div class="pre">
				<MatchEquation cells={preview.cells} label={pretty(preview.text)} />
			</div>
		{:else if error && input}
			<p class="err" role="alert">{error}</p>
		{/if}

		<button type="button" class="go" disabled={!input} onclick={() => run()}>정답 찾기</button>
	</section>

	{#if result}
		<section class="sec res" bind:this={resultEl} aria-live="polite">
			{#if result.kind === 'found'}
				<h2 class="sh">답 {result.list.length}개 <span class="rl">· 성냥 {RULE_LABEL[result.rule]}</span></h2>
				<p class="sub">주황 성냥이 새로 놓은 성냥이고, 주황 점선은 성냥을 뺀 자리예요.</p>
				<div class="answers">
					{#each result.list as s (s.text)}
						<div class="ans">
							<MatchEquation cells={s.cells} added={s.added} removed={s.removed} label={'답 ' + pretty(s.text)} />
							<p class="at">{pretty(s.text)}</p>
							<p class="ch">{changeLine(result.cells, s.cells)}</p>
						</div>
					{/each}
				</div>
			{:else if result.kind === 'already'}
				<h2 class="sh">이미 맞는 식이에요</h2>
				<p class="sub">{pretty(result.text)}는 성냥을 옮기지 않아도 맞아요. 식을 다시 한번 봐 주세요.</p>
			{:else}
				<h2 class="sh">성냥 {RULE_LABEL[result.rule]}로는 답이 없어요</h2>
				{#if result.shown}
					<p class="sub">
						성냥 <b>{RULE_LABEL[result.shown.rule]}</b>로는 답이 {result.shown.list.length}개 있어요. 문제에 적힌 규칙이 이쪽인지
						확인해 보세요.
					</p>
					<div class="answers">
						{#each result.shown.list as s (s.text)}
							<div class="ans">
								<MatchEquation cells={s.cells} added={s.added} removed={s.removed} label={'답 ' + pretty(s.text)} />
								<p class="at">{pretty(s.text)}</p>
								<p class="ch">{changeLine(result.cells, s.cells)}</p>
							</div>
						{/each}
					</div>
				{/if}
				{#if result.others.length}
					<p class="sub">{result.shown ? '그 밖에 이 규칙으로도 답이 있어요.' : '다른 규칙으로는 답이 있어요. 문제에 적힌 규칙을 한번 확인해 보세요.'}</p>
					<div class="alts">
						{#each result.others as o (o.rule)}
							<button type="button" class="alt" onclick={() => tryRule(o.rule)}>
								<b>{RULE_LABEL[o.rule]}</b><span>답 {o.n}개 보기</span>
							</button>
						{/each}
					</div>
				{:else}
					<p class="sub">
						네 가지 규칙 모두 답이 없어요. 등호를 움직이거나 숫자를 다른 모양(7을 성냥 4개로 쓰는 식)으로 쓰는
						문제일 수 있어요. 딸깍은 등호와 + 의 가로 성냥을 고정으로 봐요.
					</p>
				{/if}
			{/if}
			<a class="cta" href="/matchstick" onclick={() => track('msolve_play')}>
				성냥개비 문제 직접 풀어 보기 <span aria-hidden="true">→</span>
			</a>
		</section>
	{/if}

	<section class="sec">
		<h2 class="sh">많이 찾는 문제</h2>
		<p class="sub">검색으로 자주 찾는 식이에요. 누르면 바로 풀어요.</p>
		<div class="exs">
			{#each EXAMPLES as e (e.q)}
				<a class="ex" href="/matchstick/solve?q={encodeURIComponent(e.q)}&r={e.rule}" onclick={(ev) => pickExample(ev, e.q, e.rule)}>
					<span class="eq-q">{pretty(e.q)}</span>
					<span class="eq-a">{e.answers.map(pretty).join(', ')}</span>
					<span class="eq-r">성냥 {RULE_LABEL[e.rule]}</span>
				</a>
			{/each}
		</div>
		<a class="cta more" href="/matchstick/answer">자주 찾는 식 정답과 풀이 모음 <span aria-hidden="true">→</span></a>
	</section>

	<section class="sec">
		<h2 class="sh">규칙 네 가지</h2>
		<p class="sub">문제에 적힌 말을 보고 고르면 돼요. 「하나만 움직여서」는 1개 옮기기예요.</p>
		<div class="rulebox">
			{#each RULE_NOTES as n (n.rule)}
				<div class="rn">
					<b>{RULE_LABEL[n.rule]}</b>
					<p>{n.what}</p>
					<p class="rx">{n.ex}</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="sec">
		<h2 class="sh">답 그림 읽는 법</h2>
		<p class="mp">
			답 그림에서 <b>주황 성냥</b>은 새로 놓은 성냥이고, <b>주황 점선</b>은 성냥을 뺀 자리예요. 점선에서 주황으로 성냥
			하나가 건너갔다고 보면 돼요. 그림 아래 「5 → 9 · + → −」 같은 줄은 어느 글자가 무엇으로 바뀌었는지 적은 거예요.
			5 + 7 = 2라면 + 의 세로 성냥을 뽑아 5의 오른쪽 위에 꽂아요. 5는 9가 되고 + 는 − 가 되어 9 − 7 = 2예요. 숫자만
			들여다보다 막히는 문제는 대개 이렇게 기호가 함께 바뀌어요.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">이렇게 찾아요</h2>
		<p class="mp">
			숫자는 전광판처럼 성냥 7개 자리로 봐요. 1은 오른쪽 세로 2개, 7은 3개, 6과 9는 위아래 가로 성냥까지 6개예요.
			넣은 식에서 성냥을 규칙대로 하나씩 빼고 놓아 보면서, 모든 자리가 숫자 모양이고 양쪽 값이 같아지는 식만 골라요.
			사람이 머릿속으로 하나씩 해 보는 일을 빠짐없이 전부 해 보는 셈이에요.
		</p>
		<p class="mp">
			+ 는 세로 성냥만 움직일 수 있어요. 세로 성냥을 빼면 − 가 되고, − 에 세로 성냥을 놓으면 + 가 돼요. = 와 + 의
			가로 성냥은 그대로 두고, 빈자리에 숫자를 새로 세우지도 않아요. 딸깍의 성냥개비 문제와 같은 규칙이라, 딸깍
			문제 {MATCH_TOTAL}개를 넣으면 정답이 하나씩 그대로 나와요.
		</p>
		<p class="mp">
			답이 여러 개 나오는 식도 있어요. 9 − 9 = 5에서 성냥 하나를 옮기면 8 − 3 = 5도 되고 9 − 3 = 6도 돼요. 잘 만든
			문제는 답이 하나뿐인데, 어디서 본 문제는 그렇지 않을 때가 많아요. 그럴 땐 나온 답이 모두 맞는 답이에요.
		</p>
	</section>

	<section class="sec">
		<h2 class="sh">답이 없다고 나올 때</h2>
		<p class="mp">
			먼저 규칙을 확인해 보세요. 「하나만 옮겨서」인지 「두 개를 옮겨서」인지, 옮기는 건지 빼거나 더하는 건지에 따라
			답이 완전히 달라져요. 답이 없을 때 아래에 답이 있는 다른 규칙을 알려 드리는 것도 그래서예요.
		</p>
		<p class="mp">
			규칙이 맞는데도 답이 없다면 문제를 낸 사람이 숫자를 다르게 그렸을 가능성이 커요. 7을 왼쪽 위 성냥까지 4개로
			쓰거나, 9의 아래 성냥을 빼고 5개로 쓰는 그림이 꽤 있어요. 1을 왼쪽 세로 성냥으로 그리면 자리도 달라지고요.
			등호의 성냥 하나를 빼서 빼기로 쓰거나, 숫자를 로마 숫자(Ⅰ · Ⅴ · Ⅹ)로 놓는 문제도 있어요. 이런 문제는 그림을
			보면서 직접 풀어야 해요.
		</p>
		<p class="mp">
			답을 보기 전에 직접 풀어 보고 싶다면 <a href="/matchstick/guide">성냥개비 문제 푸는 법</a>에 한 획 차이 숫자표와
			풀이 순서를 정리해 두었어요.
		</p>
	</section>
</article>

<style>
	.tool {
		margin-top: 18px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px;
		display: flex;
		flex-direction: column;
	}
	.lbl {
		font-size: 13px;
		font-weight: 800;
		color: var(--muted);
		margin: 0 2px 8px;
	}
	.eq {
		font: inherit;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: 1px;
		font-variant-numeric: tabular-nums;
		color: var(--text);
		background: var(--bg);
		border: 1.5px solid var(--border-strong);
		border-radius: 12px;
		padding: 12px 14px;
		min-width: 0;
	}
	.eq:focus {
		outline: none;
		border-color: var(--accent);
	}
	.eq.bad {
		border-color: #d9534f;
	}
	/* 15글자까지 받는다 — 320px에서도 끝 글자가 잘리지 않게 */
	.eq.long {
		font-size: 17px;
		letter-spacing: 0;
	}
	.eq::placeholder {
		color: var(--muted-2);
		font-weight: 600;
	}
	.keys {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 6px;
		margin: 10px 0 18px;
	}
	.key {
		font: inherit;
		min-height: 44px;
		font-size: 18px;
		font-weight: 800;
		color: var(--text);
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 10px;
		cursor: pointer;
		padding: 0;
	}
	.key.sym {
		color: var(--accent-text);
	}
	.key:active {
		transform: translateY(1px);
		background: var(--border);
	}
	.rules {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		margin-bottom: 16px;
	}
	.rule {
		font: inherit;
		min-height: 44px;
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 10px;
		cursor: pointer;
	}
	.rule.on {
		color: #fff;
		background: var(--accent);
		border-color: var(--accent);
	}
	.pre {
		margin-bottom: 14px;
	}
	.err {
		margin: 0 2px 14px;
		font-size: 13.5px;
		color: #c0392b;
		word-break: keep-all;
	}
	.go {
		font: inherit;
		min-height: 54px;
		border: 0;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 16px;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.go:active:not(:disabled) {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
	.go:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.res {
		scroll-margin-top: 70px;
	}
	.sh {
		font-size: 17px;
		font-weight: 800;
		margin: 0 0 6px 2px;
		word-break: keep-all;
	}
	.rl {
		font-size: 14px;
		color: var(--muted);
		font-weight: 700;
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
		margin-bottom: 14px;
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
	.alts {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 14px;
	}
	.alt {
		font: inherit;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 50px;
		padding: 0 16px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 12px;
		cursor: pointer;
		color: var(--text);
	}
	.alt b {
		font-size: 15px;
	}
	.alt span {
		font-size: 13px;
		font-weight: 700;
		color: var(--accent-text);
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
	.cta.more {
		margin-top: 10px;
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
	.rulebox {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.rn {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		padding: 13px 15px;
	}
	.rn b {
		font-size: 15px;
	}
	.rn p {
		margin: 4px 0 0;
		font-size: 13.5px;
		line-height: 1.65;
		color: var(--muted);
		word-break: keep-all;
	}
	.rn .rx {
		color: var(--accent-text);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.mp b {
		font-weight: 800;
	}
	.mp {
		margin: 0 2px 12px;
		font-size: 14px;
		line-height: 1.8;
		color: var(--text);
		word-break: keep-all;
	}
	.mp a {
		color: var(--accent-text);
		font-weight: 700;
	}
</style>
