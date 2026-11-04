<script lang="ts">
	import { onMount } from 'svelte';
	import { pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { track } from '$lib/analytics';
	import MatchEquation from '$lib/components/MatchEquation.svelte';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import PrintSheet from '$lib/components/PrintSheet.svelte';
	import { MAKE_RULES, makeProblems, type Made, type MakeRule } from '$lib/matchMake';
	import { MAX_LEN, RULE_LABEL, changeLine, isTrueText, parseCells, pretty } from '$lib/matchSolve';

	/*
	 * 성냥 문제 만들기(2026-11-04) — 맞는 식을 넣으면 성냥을 움직여 그 식이 되는 문제를 모두 만들고, 답이 몇 개인지 센다.
	 * 왜: 정답 찾기(/matchstick/solve)는 「남이 낸 문제」를 푸는 도구다. 수업 · 모임에서 문제를 내는 사람에게는
	 * 거꾸로가 필요하다. 만든 문제는 담아서 크게 띄우거나(TV · 프로젝터) A4로 인쇄한다.
	 * 계측: mmake_run · mmake_bad · mmake_pick · mmake_show · mmake_show_end · mmake_print
	 */

	const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '=', '⌫'];
	const EXAMPLES = ['5+3=8', '13-7=6', '9-4=5', '12+34=46', '6+2=8', '0+4=4'];

	let input = $state('');
	let rule = $state<MakeRule>('move1');
	let onlyOne = $state(true);
	let made = $state<{ text: string; rule: MakeRule; list: Made[] } | null>(null);
	let err = $state('');
	let open = $state<Record<string, boolean>>({});
	/** 담은 문제 — 여러 식에서 골라 한 번에 띄우거나 인쇄한다 */
	let tray = $state<{ key: string; rule: MakeRule; m: Made }[]>([]);
	let resEl = $state<HTMLElement>();

	const parsed = $derived(input ? parseCells(input) : null);
	const preview = $derived(parsed && 'cells' in parsed ? parsed : null);
	const ones = $derived(made ? made.list.filter((m) => m.answers.length === 1) : []);
	const shown = $derived(made ? (onlyOne && ones.length ? ones : made.list) : []);
	const keyOf = (r: MakeRule, m: Made) => `${r}:${m.text}`;
	const inTray = (k: string) => tray.some((t) => t.key === k);
	/** 띄우기 · 인쇄에 쓸 문제 — 담은 것이 없으면 지금 보이는 목록 */
	const set = $derived(
		tray.length ? tray : made ? shown.map((m) => ({ key: keyOf(made!.rule, m), rule: made!.rule, m })) : []
	);

	function press(k: string) {
		err = '';
		if (k === '⌫') input = input.slice(0, -1);
		else if (input.length < MAX_LEN) input += k;
	}

	function run(from: 'button' | 'example' | 'link' = 'button') {
		const p = parseCells(input);
		if ('error' in p) {
			err = p.error;
			track('mmake_bad');
			return;
		}
		if (!isTrueText(p.text)) {
			err = `${pretty(p.text)}는 맞지 않는 식이에요. 문제를 만들려면 맞는 식(정답)을 넣어 주세요. 이 식이 문제라면 정답 찾기에서 답을 찾을 수 있어요.`;
			track('mmake_bad');
			return;
		}
		err = '';
		const list = makeProblems(p.cells, rule);
		made = { text: p.text, rule, list };
		open = {};
		track('mmake_run', { rule, n: list.length, one: list.filter((m) => m.answers.length === 1).length, from });
		try {
			replaceState(`/matchstick/make?q=${encodeURIComponent(p.text)}&r=${rule}`, {});
		} catch {
			/* 첫 진입에는 라우터가 아직이다 */
		}
		if (from !== 'link') requestAnimationFrame(() => resEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
	}

	function example(q: string) {
		input = q;
		run('example');
	}

	function togglePick(m: Made) {
		const k = keyOf(made!.rule, m);
		if (inTray(k)) tray = tray.filter((t) => t.key !== k);
		else {
			tray = [...tray, { key: k, rule: made!.rule, m }];
			track('mmake_pick');
		}
	}

	// ── 크게 띄우기 ──
	let deck = $state<{ rule: MakeRule; m: Made }[]>([]);
	let pos = $state(0);
	let step = $state(0);
	let stage = $state<HTMLDivElement>();
	let canFull = $state(false);
	const presenting = $derived(!!page.state.mshow && deck.length > 0);
	const ended = $derived(pos >= deck.length);
	const cur = $derived(ended ? null : deck[pos]);

	function show() {
		deck = set.map((t) => ({ rule: t.rule, m: t.m }));
		pos = 0;
		step = 0;
		pushState('', { mshow: true });
		track('mmake_show', { n: deck.length });
	}
	function next() {
		if (ended) return;
		pos++;
		step = 0;
		if (pos >= deck.length) track('mmake_show_end', { n: deck.length });
	}
	function forward() {
		if (ended) return;
		if (step < 1) step = 1;
		else next();
	}
	function back() {
		if (step > 0 && !ended) step = 0;
		else if (pos > 0) {
			pos--;
			step = 1;
		}
	}
	function close() {
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		if (page.state.mshow) history.back();
	}
	function full() {
		if (!stage) return;
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		else stage.requestFullscreen?.().catch(() => {});
	}
	function onKey(e: KeyboardEvent) {
		if (!presenting || e.altKey || e.ctrlKey || e.metaKey) return;
		if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
			e.preventDefault();
			forward();
		} else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
			e.preventDefault();
			back();
		} else if (e.key === 'f' || e.key === 'ㄹ') full();
	}
	$effect(() => {
		document.documentElement.style.overflow = presenting ? 'hidden' : '';
		return () => {
			document.documentElement.style.overflow = '';
		};
	});

	function print() {
		track('mmake_print', { n: set.length });
		window.print();
	}

	onMount(() => {
		canFull = !!document.documentElement.requestFullscreen;
		const q = page.url.searchParams.get('q');
		const r = page.url.searchParams.get('r') as MakeRule | null;
		if (r && MAKE_RULES.includes(r)) rule = r;
		if (q) {
			input = q;
			run('link');
		}
	});

	const ld = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: '성냥개비 문제 만들기',
		url: 'https://ddalkkak.app/matchstick/make',
		applicationCategory: 'EducationalApplication',
		operatingSystem: 'Any',
		inLanguage: 'ko',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
		description:
			'맞는 식을 넣으면 성냥 1개 옮기기 · 1개 빼기 · 1개 더하기로 그 식이 되는 성냥개비 문제를 모두 만들고 답이 몇 개인지 세어 주는 무료 도구. 크게 띄우기와 A4 인쇄를 지원한다.',
		publisher: { '@type': 'Organization', name: '딸깍', url: 'https://ddalkkak.app' }
	});
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
	<title>성냥개비 문제 만들기 — 정답 식을 넣으면 문제가 나와요 | 딸깍 퍼즐</title>
	<meta
		name="description"
		content="맞는 식을 넣으면 성냥을 움직여 그 식이 되는 성냥개비 문제를 모두 만들어 드려요. 답이 하나뿐인 문제를 골라 수업 · 모임에서 TV로 크게 띄우거나 A4 학습지로 인쇄하세요. 1개 옮기기 · 1개 빼기 · 1개 더하기."
	/>
	<link rel="canonical" href="https://ddalkkak.app/matchstick/make" />
	<meta property="og:title" content="성냥개비 문제 만들기 | 딸깍 퍼즐" />
	<meta property="og:description" content="정답 식을 넣으면 성냥개비 문제를 만들고, 크게 띄우거나 인쇄해요." />
	<meta property="og:url" content="https://ddalkkak.app/matchstick/make" />
	{@html `<script type="application/ld+json">${ld}</` + `script>`}
</svelte:head>

<article>
	<header class="cover">
		<nav class="crumb" aria-label="위치">
			<a href="/matchstick">성냥개비</a><span aria-hidden="true">›</span><span>문제 만들기</span>
		</nav>
		<h1>성냥개비 문제<br /><b>만들기</b></h1>
		<p class="lead">
			정답이 될 식을 넣으면, 성냥을 움직여 그 식이 되는 문제를 모두 만들어 드려요. 답이 하나뿐인 문제를 골라 크게
			띄우거나 학습지로 인쇄하세요.
		</p>
	</header>

	<section class="box" aria-label="문제 만들기">
		<label class="lbl" for="eq">정답 식</label>
		<input
			id="eq"
			class="eq"
			class:bad={!!err}
			class:long={input.length > 11}
			bind:value={input}
			oninput={() => (err = '')}
			inputmode="none"
			autocomplete="off"
			spellcheck="false"
			maxlength={MAX_LEN + 6}
			placeholder="예: 5+3=8"
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

		<span class="lbl">문제 규칙</span>
		<div class="rules" role="radiogroup" aria-label="문제 규칙">
			{#each MAKE_RULES as r (r)}
				<button
					type="button"
					role="radio"
					aria-checked={rule === r}
					class="rule"
					class:on={rule === r}
					onclick={() => {
						rule = r;
						err = '';
					}}>{RULE_LABEL[r]}</button
				>
			{/each}
		</div>

		{#if preview && !err}
			<div class="pre"><MatchEquation cells={preview.cells} label={pretty(preview.text)} /></div>
		{/if}
		{#if err}
			<p class="err" role="alert">
				{err}
				{#if err.includes('정답 찾기')}<a href="/matchstick/solve?q={encodeURIComponent(input)}">정답 찾기 →</a>{/if}
			</p>
		{/if}

		<button type="button" class="go" disabled={!input} onclick={() => run()}>문제 만들기</button>
		<div class="exs">
			<span>예시</span>
			{#each EXAMPLES as q (q)}
				<button type="button" class="exq" onclick={() => example(q)}>{pretty(q)}</button>
			{/each}
		</div>
	</section>

	{#if made}
		<section class="sec res" bind:this={resEl} aria-live="polite">
			{#if made.list.length}
				<h2 class="sh">문제 {made.list.length}개 <span class="rl">· 성냥 {RULE_LABEL[made.rule]} · 답 {pretty(made.text)}</span></h2>
				<p class="sub">
					답이 하나뿐인 문제가 <b>{ones.length}개</b>예요. 답이 여럿인 문제는 넣은 식 말고도 맞는 답이 있어서, 낼 때 「다른 답도
					맞아요」라고 알려 줘야 해요.
				</p>
				{#if ones.length && ones.length < made.list.length}
					<label class="chk"><input type="checkbox" bind:checked={onlyOne} /> 답이 하나뿐인 문제만 보기</label>
				{/if}
				<ul class="plist">
					{#each shown as m (m.text)}
						{@const k = keyOf(made.rule, m)}
						<li class="pi">
							<div class="ph">
								<b class="pt">{pretty(m.text)}</b>
								<span class="badge" class:one={m.answers.length === 1}
									>답 {m.answers.length === 1 ? '하나' : m.answers.length + '개'}</span
								>
							</div>
							<MatchEquation
								cells={open[k] ? m.mine.cells : m.cells}
								added={open[k] ? m.mine.added : undefined}
								removed={open[k] ? m.mine.removed : undefined}
								label={(open[k] ? '답 ' : '문제 ') + pretty(open[k] ? m.mine.text : m.text)}
							/>
							{#if open[k]}
								<p class="ans">답 {pretty(made.text)} <span>· {changeLine(m.cells, m.mine.cells)}</span></p>
								{#if m.answers.length > 1}
									<p class="also">
										다른 답 · {m.answers
											.filter((a) => a.text !== made!.text)
											.map((a) => pretty(a.text))
											.join(', ')}
									</p>
								{/if}
							{/if}
							<div class="pb">
								<button type="button" class="sm" onclick={() => (open[k] = !open[k])}
									>{open[k] ? '문제로 되돌리기' : '답 보기'}</button
								>
								<button type="button" class="sm" class:on={inTray(k)} onclick={() => togglePick(m)}
									>{inTray(k) ? '담음 ✓' : '담기'}</button
								>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<h2 class="sh">이 식으로는 성냥 {RULE_LABEL[made.rule]} 문제가 안 나와요</h2>
				<p class="sub">다른 규칙을 골라 보거나, 성냥이 많이 들어가는 숫자(0 · 6 · 8 · 9)가 있는 식을 넣어 보세요.</p>
			{/if}
		</section>
	{/if}

	{#if set.length}
		<div class="dock">
			<span class="dn">{tray.length ? `담은 문제 ${tray.length}개` : `보이는 문제 ${set.length}개`}</span>
			<button type="button" class="db" onclick={show}>크게 띄우기</button>
			<button type="button" class="db" onclick={print}>인쇄</button>
			{#if tray.length}<button type="button" class="db x" onclick={() => (tray = [])}>비우기</button>{/if}
		</div>
	{/if}

	<section class="sec">
		<h2 class="sh">이렇게 만들어요</h2>
		<p class="mp">
			정답 찾기를 거꾸로 돌려요. 1개 옮기기 문제는 정답 식에서 성냥 하나를 다른 자리로 옮겨 만들고, 1개 빼기 문제는 정답에
			성냥 하나를 <b>더해서</b>, 1개 더하기 문제는 정답에서 성냥 하나를 <b>빼서</b> 만들어요. 그렇게 나온 식 가운데 모든 자리가
			숫자 모양이고, 틀린 식이고, 0으로 시작하는 두 자리 수가 없는 것만 남겨요.
		</p>
		<p class="mp">
			남은 문제마다 <a href="/matchstick/solve">정답 찾기</a>로 다시 풀어 답이 몇 개인지 세요. 넣은 식 말고 다른 답이 없으면
			「답 하나」예요. 문제를 내는 사람에게 가장 곤란한 말이 「저는 다른 답이 나왔는데요?」라서, 답이 하나뿐인 문제를 맨 앞에
			두었어요.
		</p>
		<p class="mp">
			2개 옮기기는 경우가 수만 가지라 휴대폰에서 답 수를 다 세기 어려워 아직 넣지 않았어요. = 와 + 의 가로 성냥은 그대로 두고,
			빈자리에 숫자를 새로 세우지도 않아요. 딸깍의 <a href="/matchstick">성냥개비 문제</a>와 같은 규칙이에요.
		</p>

		<h2 class="sh">수업 · 모임에서 쓰는 법</h2>
		<ol class="steps">
			<li>식 몇 개로 문제를 만들고, 마음에 드는 문제를 <b>담기</b>로 모아요. 여러 식에서 골라도 돼요.</li>
			<li>
				<b>크게 띄우기</b>를 누르면 TV · 프로젝터에 문제가 하나씩 크게 나와요. 화면을 누르거나 → · 스페이스 · 발표 리모컨으로 답을
				열고 다음 문제로 가요.
			</li>
			<li><b>인쇄</b>를 누르면 A4에 문제 쪽과 답 쪽이 따로 나와요. 답 쪽은 진행자가 들고 있으면 돼요.</li>
		</ol>
		<p class="mp">
			좋은 문제를 고르는 요령도 있어요. 숫자만 바뀌는 문제보다 + 가 − 로 바뀌는 문제가 더 오래 걸리고, 5 · 9처럼 한 획 차이
			짝이 많은 숫자가 들어가면 막히는 사람이 많아요. 자세한 숫자표는 <a href="/matchstick/guide">성냥개비 문제 푸는 법</a>에
			있어요.
		</p>
	</section>

	<OtherGames current="match" />
</article>

{#if set.length}
	<PrintSheet>
		<h1 class="p-h">성냥개비 문제</h1>
		<p class="p-n">이름 ________________ · 성냥을 규칙대로 움직여 맞는 식을 만드세요.</p>
		<ol class="p-list">
			{#each set as t, i (t.key)}
				<li class="p-i">
					<span class="p-q">{i + 1}. 성냥 {RULE_LABEL[t.rule]}</span>
					<MatchEquation cells={t.m.cells} label={pretty(t.m.text)} />
				</li>
			{/each}
		</ol>
		<p class="p-f">ddalkkak.app/matchstick/make 에서 만들었어요</p>
		<div class="p-break"></div>
		<h1 class="p-h">답</h1>
		<ol class="p-list">
			{#each set as t, i (t.key)}
				<li class="p-i">
					<span class="p-q"
						>{i + 1}. {pretty(t.m.text)} → <b>{t.m.answers.map((a) => pretty(a.text)).join(' 또는 ')}</b></span
					>
					<MatchEquation
						cells={t.m.mine.cells}
						added={t.m.mine.added}
						removed={t.m.mine.removed}
						label={'답 ' + pretty(t.m.mine.text)}
					/>
				</li>
			{/each}
		</ol>
	</PrintSheet>
{/if}

{#if presenting}
	<div class="stage" bind:this={stage} role="dialog" aria-modal="true" aria-label="성냥 문제 진행 화면">
		<div class="bar">
			<span class="pos">{ended ? '끝' : `${pos + 1} / ${deck.length}`}</span>
			<span class="tools">
				{#if canFull}<button class="tl" onclick={full}>전체 화면</button>{/if}
				<button class="tl" onclick={close}>끝내기</button>
			</span>
		</div>
		{#if cur}
			<button class="board" onclick={forward} aria-label={step ? '다음 문제' : '답 보기'}>
				<span class="rl2">성냥 {RULE_LABEL[cur.rule]}로 맞는 식을 만드세요</span>
				<span class="big">
					<MatchEquation
						cells={step ? cur.m.mine.cells : cur.m.cells}
						added={step ? cur.m.mine.added : undefined}
						removed={step ? cur.m.mine.removed : undefined}
						label={pretty(step ? cur.m.mine.text : cur.m.text)}
					/>
				</span>
				<span class="answer" class:show={step >= 1}>{pretty(cur.m.mine.text)}</span>
				{#if step >= 1 && cur.m.answers.length > 1}
					<span class="also2"
						>이것도 정답 · {cur.m.answers
							.filter((a) => a.text !== cur.m.mine.text)
							.map((a) => pretty(a.text))
							.join(', ')}</span
					>
				{/if}
			</button>
			<div class="ctl">
				<button class="c" onclick={back} disabled={pos === 0 && step === 0}>← 이전</button>
				<button class="c" onclick={() => (step = 1)} disabled={step >= 1}>답</button>
				<button class="c go2" onclick={next}>{pos === deck.length - 1 ? '끝내기' : '다음'} →</button>
			</div>
		{:else}
			<div class="end">
				<p class="endbig">{deck.length}문제 끝!</p>
				<div class="ctl two">
					<button class="c" onclick={back}>← 마지막 문제</button>
					<button class="c go2" onclick={close}>문제 더 만들기</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.box {
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
		grid-template-columns: repeat(3, 1fr);
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
		word-break: keep-all;
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
		line-height: 1.6;
		color: #c0392b;
		word-break: keep-all;
	}
	.err a {
		color: var(--accent-text);
		font-weight: 800;
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
	.exs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		margin-top: 14px;
		font-size: 13px;
		color: var(--muted);
		font-weight: 700;
	}
	.exq {
		font: inherit;
		font-size: 13.5px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		min-height: 36px;
		padding: 0 10px;
		border-radius: 999px;
		border: 1px solid var(--border-strong);
		background: var(--panel-2);
		color: var(--text);
		cursor: pointer;
		white-space: nowrap;
	}
	.sec {
		margin-top: 26px;
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
	.chk {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		margin: 0 2px 8px;
		font-size: 14px;
		font-weight: 700;
	}
	.chk input {
		width: 20px;
		height: 20px;
		accent-color: var(--accent);
	}
	.plist {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.pi {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 12px;
	}
	.ph {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin: 0 2px 8px;
	}
	.pt {
		font-size: 18px;
		font-variant-numeric: tabular-nums;
	}
	.badge {
		font-size: 12px;
		font-weight: 800;
		padding: 3px 9px;
		border-radius: 999px;
		background: var(--panel-2);
		color: var(--muted);
		white-space: nowrap;
	}
	.badge.one {
		background: var(--accent);
		color: #fff;
	}
	.ans {
		margin: 10px 2px 0;
		text-align: center;
		font-size: 17px;
		font-weight: 800;
		color: var(--accent-text);
		font-variant-numeric: tabular-nums;
	}
	.ans span {
		font-size: 13px;
		color: var(--muted);
		font-weight: 600;
	}
	.also {
		margin: 4px 2px 0;
		text-align: center;
		font-size: 13px;
		color: var(--muted);
		word-break: keep-all;
	}
	.pb {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		margin-top: 10px;
	}
	.sm {
		font: inherit;
		min-height: 44px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--panel-2);
		color: var(--text);
		font-size: 14px;
		font-weight: 800;
		cursor: pointer;
	}
	.sm.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	/* 담은 문제 막대 — 하단 탭 바로 위에 붙는다 */
	.dock {
		position: sticky;
		bottom: calc(72px + env(safe-area-inset-bottom));
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 14px;
		padding: 8px 8px 8px 14px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 14px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
	}
	.dn {
		flex: 1;
		min-width: 0;
		font-size: 13.5px;
		font-weight: 800;
		word-break: keep-all;
	}
	.db {
		font: inherit;
		min-height: 44px;
		padding: 0 12px;
		border-radius: 10px;
		border: 0;
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 800;
		cursor: pointer;
		white-space: nowrap;
	}
	.db.x {
		background: var(--panel-2);
		color: var(--muted);
		border: 1px solid var(--border);
	}
	.mp {
		margin: 0 2px 12px;
		font-size: 14px;
		line-height: 1.8;
		word-break: keep-all;
	}
	.mp a {
		color: var(--accent-text);
		font-weight: 700;
	}
	.steps {
		margin: 0 0 12px;
		padding-left: 22px;
		font-size: 14px;
		line-height: 1.8;
		word-break: keep-all;
	}

	/* 인쇄 쪽 — 화면에서는 PrintSheet가 숨긴다 */
	.p-h {
		font-size: 18pt;
		margin: 0 0 4pt;
	}
	.p-n,
	.p-f {
		margin: 0 0 10pt;
		font-size: 10pt;
		color: #444;
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
	}
	.p-q {
		display: block;
		margin-bottom: 3pt;
		font-size: 10.5pt;
	}
	.p-break {
		break-after: page;
	}

	/* 진행 화면 — 초성 퀴즈 띄우기와 같은 틀 */
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
	.tl {
		min-height: 44px;
		padding: 0 14px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		font: inherit;
		font-size: max(14px, 2.4vh);
		font-weight: 800;
		color: var(--text);
		cursor: pointer;
		white-space: nowrap;
	}
	.board {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2.5vh;
		background: none;
		border: 0;
		color: inherit;
		font: inherit;
		cursor: pointer;
		text-align: center;
		padding: 8px 0;
	}
	.rl2 {
		font-size: min(5vw, 4vh);
		font-weight: 800;
		color: var(--muted);
		word-break: keep-all;
	}
	.big {
		display: block;
		width: min(100%, 130vh);
	}
	.big :global(svg) {
		max-width: none !important;
		max-height: 42vh;
	}
	.answer {
		visibility: hidden;
		font-size: min(10vw, 10vh);
		font-weight: 900;
		color: var(--accent-text);
		font-variant-numeric: tabular-nums;
	}
	.answer.show {
		visibility: visible;
	}
	.also2 {
		font-size: min(4.5vw, 3.4vh);
		color: var(--muted);
		font-weight: 700;
	}
	.ctl {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	.ctl.two {
		grid-template-columns: 1fr 1fr;
		width: min(100%, 460px);
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
	.c.go2 {
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
	}
	.endbig {
		margin: 0;
		font-size: min(12vw, 12vh);
		font-weight: 900;
	}
</style>
