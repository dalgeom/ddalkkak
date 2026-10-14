<script lang="ts">
	import { onDestroy } from 'svelte';
	import { track } from '$lib/analytics';
	import { duelOutcome, DUEL_SIZE } from '$lib/duel';
	import { formatDuration } from '$lib/game';
	import OtherGames from '$lib/components/OtherGames.svelte';

	/**
	 * 상식 퀴즈 대결(v2, 2026-10-14) — 같은 10문제로 친구와 점수·시간을 겨룬다(duel.ts).
	 * 링크(?s=씨앗&n=점수&t=초)로 들어오면 친구 기록을 먼저 보여 주고 같은 문제로 시작한다.
	 */
	let { data } = $props();

	let phase = $state<'intro' | 'play' | 'done'>('intro');
	let pos = $state(0);
	let picked = $state<number | null>(null);
	let score = $state(0);
	let startedAt = 0;
	let secs = $state(0);
	let toastMsg = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;

	let q = $derived(data.questions[pos]);
	let outcome = $derived(data.vs && phase === 'done' ? duelOutcome({ score, secs }, data.vs) : null);
	let shareUrl = $derived(`https://ddalkkak.app/trivia/duel?s=${data.seed}&n=${score}&t=${secs}`);

	function start() {
		phase = 'play';
		pos = 0;
		score = 0;
		picked = null;
		startedAt = Date.now();
		track('duel_start', { vs: !!data.vs });
		window.scrollTo({ top: 0 });
	}

	function choose(i: number) {
		if (picked !== null) return;
		picked = i;
		if (i === q.answerIndex) score++;
	}

	function next() {
		if (pos + 1 < data.questions.length) {
			pos++;
			picked = null;
			window.scrollTo({ top: 0 });
			return;
		}
		secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
		phase = 'done';
		track('duel_finish', { score, vs: !!data.vs, outcome: outcome ?? 'solo' });
		window.scrollTo({ top: 0 });
	}

	function toast(m: string) {
		toastMsg = m;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 2200);
	}
	onDestroy(() => clearTimeout(toastTimer));

	async function share() {
		const head =
			outcome === 'win'
				? `상식 퀴즈 대결에서 이겼어요! 나 ${score}/${DUEL_SIZE}`
				: `상식 퀴즈 대결 — 나 ${score}/${DUEL_SIZE} (${formatDuration(secs * 1000)})`;
		const text = `${head}\n같은 10문제로 이겨 볼래요?`;
		track('duel_share', { score });
		try {
			if (navigator.share) {
				await navigator.share({ title: '딸깍 상식 퀴즈 대결', text, url: shareUrl });
				return;
			}
		} catch {
			return; // 공유 창을 닫았다
		}
		try {
			await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
			toast('링크를 복사했어요. 친구에게 붙여 넣어 보내세요');
		} catch {
			toast('복사가 안 됐어요. 주소창의 링크를 보내 주세요');
		}
	}

	function again() {
		location.href = '/trivia/duel';
	}
</script>

<svelte:head>
	<title>상식 퀴즈 대결 — 같은 10문제로 친구와 겨루기 | 딸깍</title>
	<meta
		name="description"
		content="상식 퀴즈 10문제를 풀고 링크를 보내면 친구가 같은 문제로 도전해요. 점수가 같으면 빠른 쪽이 이겨요. 가입 없이 바로."
	/>
	<link rel="canonical" href="https://ddalkkak.app/trivia/duel" />
</svelte:head>

{#if phase === 'intro'}
	<section class="intro card">
		<span class="kicker">상식 퀴즈 대결</span>
		{#if data.vs}
			<h1>친구가 대결을 신청했어요</h1>
			<div class="vs">
				<span>친구 기록</span>
				<b>{data.vs.score} / {DUEL_SIZE}</b>
				<em>{formatDuration(data.vs.secs * 1000)}</em>
			</div>
			<p class="lead">같은 10문제예요. 점수가 같으면 더 빨리 푼 쪽이 이겨요.</p>
			<button class="cta" onclick={start}>도전하기 <span aria-hidden="true">→</span></button>
		{:else}
			<h1>같은 10문제로<br /><b>친구와 겨뤄요</b></h1>
			<p class="lead">
				상식 퀴즈 10문제를 풀고 결과 링크를 보내면, 친구가 같은 문제로 도전해요. 점수가 같으면 더 빨리 푼
				쪽이 이겨요.
			</p>
			<button class="cta" onclick={start}>대결 시작 <span aria-hidden="true">→</span></button>
		{/if}
		<p class="meta">초등 3 · 중등 3 · 고등 2 · 어른 2 · 쉬운 문제부터</p>
	</section>
{:else if phase === 'play' && q}
	<div class="topbar">
		<span class="prog">{pos + 1} / {data.questions.length}</span>
		<span class="sc">맞힌 수 {score}</span>
	</div>
	<div class="bar"><i style="width:{((pos + (picked !== null ? 1 : 0)) / data.questions.length) * 100}%"></i></div>
	<section class="card qcard">
		<div class="chips"><span>{q.category}</span><span class="g">{q.grade}</span></div>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- 문제 문장은 우리 데이터(trivia.ts)다 -->
		<h2 class="q">{@html q.html}</h2>
		<div class="choices">
			{#each q.choices as c, i (i)}
				<button
					class="choice"
					class:ok={picked !== null && i === q.answerIndex}
					class:no={picked === i && i !== q.answerIndex}
					disabled={picked !== null}
					onclick={() => choose(i)}
				>
					<span class="badge">{'ABCDE'[i]}</span>{c}
				</button>
			{/each}
		</div>
		{#if picked !== null}
			<p class="verdict" class:right={picked === q.answerIndex}>
				{picked === q.answerIndex ? '딸깍! 맞혔어요' : '아쉬워요'}
			</p>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- 해설은 우리 데이터다 -->
			<p class="exp">{@html q.explain}</p>
			<button class="cta" onclick={next}>
				{pos + 1 < data.questions.length ? '다음 문제' : '결과 보기'} <span aria-hidden="true">→</span>
			</button>
		{/if}
	</section>
{:else if phase === 'done'}
	<section class="card result">
		<span class="kicker">상식 퀴즈 대결</span>
		<div class="big">{score}<span> / {DUEL_SIZE}</span></div>
		<p class="time">{formatDuration(secs * 1000)} 걸렸어요</p>
		{#if data.vs && outcome}
			<div class="vsres {outcome}">
				<b>{outcome === 'win' ? '이겼어요!' : outcome === 'lose' ? '졌어요' : '비겼어요'}</b>
				<span>친구 {data.vs.score} / {DUEL_SIZE} · {formatDuration(data.vs.secs * 1000)}</span>
			</div>
		{/if}
		<button class="cta" onclick={share}>
			{data.vs ? '친구에게 결과 보내기' : '친구에게 대결 신청하기'} <span aria-hidden="true">→</span>
		</button>
		<p class="note">링크를 받은 친구는 같은 10문제를 풀어요</p>
		<button class="ghost" onclick={again}>새 문제로 다시 대결</button>
		<a class="ghost" href="/trivia">상식 퀴즈 더 보기</a>
	</section>
	<OtherGames current="trivia" />
{/if}

{#if toastMsg}
	<div class="toast" role="status">{toastMsg}</div>
{/if}

<style>
	.card {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		padding: 22px 18px;
	}
	.kicker {
		display: inline-block;
		font-size: 12px;
		font-weight: 800;
		color: var(--accent-text);
		background: var(--correct-bg);
		border-radius: 7px;
		padding: 3px 9px;
	}
	h1 {
		margin-top: 10px;
		font-size: 26px;
		font-weight: 900;
		line-height: 1.35;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent-text);
	}
	.lead {
		margin-top: 10px;
		font-size: 14.5px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.meta {
		margin-top: 12px;
		font-size: 12.5px;
		color: var(--muted);
		text-align: center;
	}
	.vs {
		margin-top: 14px;
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 14px 16px;
		border-radius: 14px;
		background: var(--panel-2);
		border: 1px solid var(--border);
	}
	.vs span {
		font-size: 13px;
		color: var(--muted);
	}
	.vs b {
		font-size: 24px;
		font-weight: 900;
	}
	.vs em {
		font-style: normal;
		font-size: 14px;
		font-weight: 700;
		color: var(--muted);
	}
	.cta {
		width: 100%;
		margin-top: 18px;
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
	.topbar {
		display: flex;
		justify-content: space-between;
		font-size: 14px;
		font-weight: 800;
		margin-bottom: 8px;
	}
	.sc {
		color: var(--accent-text);
	}
	.bar {
		height: 6px;
		border-radius: 4px;
		background: var(--border);
		overflow: hidden;
		margin-bottom: 14px;
	}
	.bar i {
		display: block;
		height: 100%;
		background: var(--accent);
		transition: width 0.25s ease-out;
	}
	.chips {
		display: flex;
		gap: 6px;
	}
	.chips span {
		font-size: 12px;
		font-weight: 800;
		color: var(--muted);
		background: var(--panel-2);
		border-radius: 7px;
		padding: 3px 8px;
	}
	.chips .g {
		color: var(--gold-text);
		background: var(--gold-bg);
	}
	.q {
		margin: 12px 0 14px;
		font-size: 18px;
		font-weight: 800;
		line-height: 1.55;
		word-break: keep-all;
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 13px 14px;
		border-radius: 14px;
		border: 1.5px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font-size: 15.5px;
		font-weight: 600;
		text-align: left;
		font-family: inherit;
		cursor: pointer;
	}
	.choice:disabled {
		cursor: default;
	}
	.choice.ok {
		border-color: var(--accent);
		background: var(--correct-bg);
	}
	.choice.no {
		border-color: var(--danger);
		background: var(--danger-bg);
	}
	.badge {
		flex: none;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--panel-2);
		border: 1px solid var(--border-strong);
		font-size: 12px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.verdict {
		margin-top: 14px;
		font-size: 16px;
		font-weight: 900;
		color: var(--danger);
	}
	.verdict.right {
		color: var(--accent-text);
	}
	.exp {
		margin-top: 6px;
		font-size: 14px;
		line-height: 1.7;
		color: var(--muted);
		word-break: keep-all;
	}
	.result {
		text-align: center;
	}
	.big {
		margin-top: 12px;
		font-size: 60px;
		font-weight: 900;
		color: var(--accent-text);
		line-height: 1.1;
	}
	.big span {
		font-size: 24px;
		color: var(--muted);
	}
	.time {
		margin-top: 4px;
		font-size: 14px;
		color: var(--muted);
	}
	.vsres {
		margin-top: 14px;
		padding: 12px;
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		background: var(--panel-2);
	}
	.vsres b {
		font-size: 20px;
		font-weight: 900;
	}
	.vsres.win b {
		color: var(--accent-text);
	}
	.vsres.lose b {
		color: var(--danger);
	}
	.vsres span {
		font-size: 13px;
		color: var(--muted);
	}
	.note {
		margin-top: 8px;
		font-size: 12.5px;
		color: var(--muted);
	}
	.ghost {
		display: block;
		width: 100%;
		margin-top: 10px;
		padding: 13px;
		border-radius: 14px;
		border: 1px solid var(--border-strong);
		background: transparent;
		color: var(--text);
		font-size: 14.5px;
		font-weight: 700;
		font-family: inherit;
		text-decoration: none;
		cursor: pointer;
		box-sizing: border-box;
	}
	.toast {
		position: fixed;
		left: 50%;
		bottom: calc(90px + env(safe-area-inset-bottom));
		transform: translateX(-50%);
		background: #2c2822;
		color: #fff;
		font-size: 14px;
		padding: 10px 16px;
		border-radius: 12px;
		z-index: 70;
		max-width: 90%;
		text-align: center;
	}
</style>
