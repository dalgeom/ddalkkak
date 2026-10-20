<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { track, seenOnce } from '$lib/analytics';
	import QuickReact from '$lib/components/QuickReact.svelte';
	import OtherGames from '$lib/components/OtherGames.svelte';
	import MatchstickBoard, { type PickLoc } from '$lib/components/MatchstickBoard.svelte';
	import { duelOutcome } from '$lib/duel';
	import { MDUEL_SIZE } from '$lib/matchDuel';
	import { formatDuration } from '$lib/game';
	import { parseEq, cloneBoard, bit, judgeRule, type Board } from '$lib/matchstick';

	/**
	 * 성냥 대결(2026-10-20) — 같은 5문제(하나 옮기기)로 친구와 맞힌 수 · 시간을 겨룬다(matchDuel.ts).
	 * 링크(?s=씨앗&n=점수&t=초)로 들어오면 친구 기록을 먼저 보여 주고 같은 문제로 시작한다.
	 * 답장(&a=&b=)이면 문제 대신 결과 비교를 보여 주고 「새 문제로 복수전」으로 잇는다 — 상식 대결과 같다.
	 *
	 * 첫 화면에 1번 판을 바로 둔다(상식 대결 10/16). 성냥을 처음 누르는 순간이 시작이고 시간도 그때부터 잰다.
	 * 힌트는 없다(같은 조건으로 겨룬다). 막히면 「넘기기」 — 정답을 보여 주고 다음 문제로 간다.
	 */
	let { data } = $props();

	let phase = $state<'reply' | 'play' | 'done'>(data.vs && data.mine ? 'reply' : 'play');
	let started = $state(false);
	let pos = $state(0);
	let results = $state<('win' | 'skip')[]>([]);
	let score = $derived(results.filter((r) => r === 'win').length);
	let startedAt = 0;
	let secs = $state(0);

	let orig = $state<Board | null>(null);
	let cur = $state<Board | null>(null);
	let animFrom = $state<Board | null>(null);
	let picked = $state<PickLoc | null>(null);
	/** 지금 문제를 끝냈나 — 끝난 판은 성냥을 더 받지 않는다 */
	let settled = $state(false);
	let feedback = $state('');
	let shaking = $state(false);
	let toastMsg = $state('');
	let timers: ReturnType<typeof setTimeout>[] = [];
	const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

	let item = $derived(data.items[pos]);
	let outcome = $derived(data.vs && phase === 'done' ? duelOutcome({ score, secs }, data.vs) : null);
	// 친구 도전장에 답하는 링크면 그 친구 기록(a·b)을 붙인다 — 친구가 열면 결과 비교가 뜬다
	let shareUrl = $derived(
		`https://ddalkkak.app/matchstick/duel?s=${data.seed}&n=${score}&t=${secs}` + (data.vs ? `&a=${data.vs.score}&b=${data.vs.secs}` : '')
	);
	// 답장 화면은 도전장을 보낸 내 쪽에서 본다 — 나 = mine, 친구 = vs
	let replyOutcome = $derived(data.vs && data.mine ? duelOutcome(data.mine, data.vs) : null);

	function load() {
		orig = parseEq(item.displayed);
		cur = cloneBoard(orig);
		animFrom = null;
		picked = null;
		settled = false;
		feedback = '';
	}
	load();

	onMount(() => {
		if (phase === 'reply') track('mduel_reply_open', { outcome: replyOutcome ?? '' });
	});
	onDestroy(() => timers.forEach(clearTimeout));

	function begin() {
		if (started) return;
		started = true;
		startedAt = Date.now();
		track('mduel_start', { vs: !!data.vs });
		if (data.vs) track('mduel_start_link');
	}

	function applyRemove(loc: PickLoc) {
		if (loc.kind === 'op') cur!.opPlus = false;
		else cur!.glyphs[loc.gi!] &= ~bit(loc.seg!);
	}
	function applyAdd(loc: PickLoc) {
		if (loc.kind === 'op') cur!.opPlus = true;
		else cur!.glyphs[loc.gi!] |= bit(loc.seg!);
	}
	const sameLoc = (a: PickLoc, b: PickLoc) => a.kind === b.kind && a.gi === b.gi && a.seg === b.seg;

	function handleStick(loc: PickLoc, lit: boolean) {
		if (phase !== 'play' || settled || !cur || !orig) return;
		if (!picked) {
			if (!lit) return;
			begin();
			picked = loc;
			applyRemove(loc);
			return;
		}
		// 뽑은 자리에 다시 꽂으면 내려놓기
		if (!lit && sameLoc(picked, loc)) {
			applyAdd(loc);
			picked = null;
			return;
		}
		if (lit) return;
		applyAdd(loc);
		picked = null;
		if (judgeRule(orig, cur, 'move1') === 'solved') return settle('win');
		feedback = '아직 아니에요!';
		shaking = true;
		later(() => {
			shaking = false;
			cur = cloneBoard(orig!);
		}, 420);
	}

	function skip() {
		if (settled) return;
		begin();
		// 원래 배치에서 성냥이 날아가 정답 자리에 앉는 연출(성냥 화면과 같다)
		animFrom = cloneBoard(orig!);
		cur = parseEq(item.solution);
		picked = null;
		settle('skip');
	}

	function settle(r: 'win' | 'skip') {
		settled = true;
		results = [...results, r];
		feedback = r === 'win' ? '딸깍! 맞혔어요' : `정답: ${item.solution.replace('-', '−')}`;
		later(next, r === 'win' ? 700 : 1500);
	}

	function next() {
		if (pos + 1 < data.items.length) {
			pos++;
			load();
			return;
		}
		secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
		phase = 'done';
		track('mduel_finish', { score, vs: !!data.vs, outcome: outcome ?? 'solo' });
		window.scrollTo({ top: 0 });
	}

	function toast(m: string) {
		toastMsg = m;
		later(() => (toastMsg = ''), 2200);
	}

	async function share() {
		const head =
			outcome === 'win'
				? `성냥개비 대결에서 이겼어요! 나 ${score}/${MDUEL_SIZE}`
				: `성냥개비 대결 — 나 ${score}/${MDUEL_SIZE} (${formatDuration(secs * 1000)})`;
		const text = `${head}\n${data.vs ? '누가 이겼는지 확인해 봐요' : '같은 5문제로 이겨 볼래요?'}`;
		track('mduel_share', { score });
		try {
			if (navigator.share) {
				await navigator.share({ title: '딸깍 성냥개비 대결', text, url: shareUrl });
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

	function sendSeen(node: HTMLElement) {
		return seenOnce(node, 'mduel_share_seen');
	}

	function rematch() {
		track('mduel_rematch', { outcome: replyOutcome ?? '' });
		location.href = '/matchstick/duel';
	}

	function playThis() {
		phase = 'play';
		window.scrollTo({ top: 0 });
	}
</script>

<svelte:head>
	<title>성냥개비 대결 — 같은 5문제로 친구와 겨루기 | 딸깍</title>
	<meta
		name="description"
		content="성냥 하나만 옮겨 틀린 식을 맞게 고치는 5문제를 풀고 링크를 보내면 친구가 같은 문제로 도전해요. 많이 풀수록, 같으면 빠른 쪽이 이겨요. 가입 없이 바로."
	/>
	<link rel="canonical" href="https://ddalkkak.app/matchstick/duel" />
	<meta property="og:title" content={data.og.title} />
	<meta property="og:description" content={data.og.description} />
	<meta property="og:url" content={data.ogUrl} />
</svelte:head>

{#if phase === 'reply' && data.vs && data.mine}
	<section class="card result">
		<span class="kicker">성냥개비 대결</span>
		<h1 class="reply-h">
			{replyOutcome === 'win' ? '내가 이겼어요!' : replyOutcome === 'lose' ? '친구가 이겼어요' : '비겼어요'}
		</h1>
		<p class="lead">친구가 내 도전장에 답했어요.</p>
		<div class="board-vs">
			<div class="side" class:won={replyOutcome === 'win'}>
				<span class="who">나</span>
				<b>{data.mine.score}<small> / {MDUEL_SIZE}</small></b>
				<span class="t">{formatDuration(data.mine.secs * 1000)}</span>
			</div>
			<div class="side" class:won={replyOutcome === 'lose'}>
				<span class="who">친구</span>
				<b>{data.vs.score}<small> / {MDUEL_SIZE}</small></b>
				<span class="t">{formatDuration(data.vs.secs * 1000)}</span>
			</div>
		</div>
		<button class="cta" onclick={rematch}>
			{replyOutcome === 'lose' ? '새 문제로 복수전' : '새 문제로 한 판 더'} <span aria-hidden="true">→</span>
		</button>
		<p class="note">새 5문제를 풀고 친구에게 다시 도전장을 보내요</p>
		<button class="ghost" onclick={playThis}>이 5문제 내가 풀어 보기</button>
	</section>
	<OtherGames current="match" />
{:else if phase === 'play' && item}
	{#if !started}
		<header class="intro">
			<span class="kicker">성냥개비 대결</span>
			{#if data.vs}
				<h1>친구가 <b>{data.vs.score} / {MDUEL_SIZE}</b>로 도전장을 보냈어요</h1>
				<p class="lead">같은 5문제예요. 친구는 {formatDuration(data.vs.secs * 1000)} 걸렸어요. 아래 1번부터 바로 풀어요.</p>
			{:else}
				<h1>같은 5문제로 <b>친구와 겨뤄요</b></h1>
				<p class="lead">성냥 하나만 옮겨 식을 맞게 고쳐요. 다 풀면 결과 링크를 친구에게 보내요. 많이 풀수록, 같으면 빨리 푼 쪽이 이겨요.</p>
			{/if}
		</header>
	{/if}
	<div class="topbar">
		<span class="prog">{pos + 1} / {data.items.length}</span>
		<span class="sc">{started ? `맞힌 수 ${score}` : '성냥을 누르면 시작해요'}</span>
	</div>
	<div class="bar"><i style="width:{(results.length / data.items.length) * 100}%"></i></div>
	<section class="card play">
		<p class="rule">성냥 <b>하나</b>를 옮겨 식을 맞게</p>
		{#if cur}
			<div class:shaking>
				<MatchstickBoard board={cur} {picked} onstick={handleStick} animateFrom={animFrom} label={item.displayed} />
			</div>
		{/if}
		{#if feedback}
			<p class="verdict" class:right={settled && results.at(-1) === 'win'} role="alert" aria-live="assertive">{feedback}</p>
		{/if}
		{#if !settled}
			<div class="controls">
				<button class="ghost" onclick={() => cur && orig && ((cur = cloneBoard(orig)), (picked = null))}>처음부터</button>
				<button class="ghost" onclick={skip}>넘기기</button>
			</div>
		{/if}
	</section>
{:else if phase === 'done'}
	<section class="card result">
		<span class="kicker">성냥개비 대결</span>
		<div class="big">{score}<span> / {MDUEL_SIZE}</span></div>
		<p class="time">{formatDuration(secs * 1000)} 걸렸어요</p>
		{#if data.vs && outcome}
			<div class="vsres {outcome}">
				<b>{outcome === 'win' ? '이겼어요!' : outcome === 'lose' ? '졌어요' : '비겼어요'}</b>
				<span>친구 {data.vs.score} / {MDUEL_SIZE} · {formatDuration(data.vs.secs * 1000)}</span>
			</div>
		{/if}
		<div class="send" use:sendSeen>
			<p class="send-h">친구 카톡에는 이렇게 떠요</p>
			{#if data.vs}
				<img class="preview" src="/og/mduel-reply-{data.vs.score}.png" width="1200" height="630" alt="친구 {data.vs.score}/{MDUEL_SIZE} 대 나 ?/{MDUEL_SIZE} 결과 도착 미리보기 그림" />
			{:else}
				<img class="preview" src="/og/mduel-{score}.png" width="1200" height="630" alt="친구 {score}/{MDUEL_SIZE} 대 나 ?/{MDUEL_SIZE} 미리보기 그림" />
			{/if}
			<button class="cta" onclick={share}>
				{data.vs ? '친구에게 결과 보내기' : '친구에게 대결 신청하기'} <span aria-hidden="true">→</span>
			</button>
			<p class="note">{data.vs ? '친구가 열면 둘의 결과를 나란히 보여 줘요' : '링크를 받은 친구는 같은 5문제를 풀어요'}</p>
		</div>
		<QuickReact place="/matchstick/duel?s={data.seed}" question="이번 5문제 어땠어요?" />
		<button class="ghost" onclick={() => (location.href = '/matchstick/duel')}>새 문제로 다시 대결</button>
		<a class="ghost" href="/matchstick">성냥개비 더 풀기</a>
	</section>
	<OtherGames current="match" />
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
	.intro {
		margin-bottom: 14px;
	}
	.intro h1 {
		font-size: 22px;
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
	.play {
		text-align: center;
	}
	.rule {
		font-size: 14px;
		color: var(--muted);
		margin-bottom: 10px;
	}
	.rule b {
		color: var(--text);
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
	.controls {
		display: flex;
		gap: 10px;
		margin-top: 14px;
	}
	.controls .ghost {
		flex: 1;
		margin-top: 0;
	}
	.shaking {
		animation: shake 0.3s ease;
	}
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-6px);
		}
		75% {
			transform: translateX(6px);
		}
	}
	.result {
		text-align: center;
	}
	.reply-h {
		font-size: 28px;
	}
	.board-vs {
		margin-top: 18px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.side {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 16px 8px;
		border-radius: 14px;
		background: var(--panel-2);
		border: 1.5px solid transparent;
	}
	.side.won {
		border-color: var(--accent);
		background: var(--correct-bg);
	}
	.side .who {
		font-size: 13px;
		font-weight: 800;
		color: var(--muted);
	}
	.side b {
		font-size: 40px;
		font-weight: 900;
		line-height: 1.1;
	}
	.side.won b {
		color: var(--accent-text);
	}
	.side b small {
		font-size: 16px;
		color: var(--muted);
	}
	.side .t {
		font-size: 13px;
		color: var(--muted);
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
	.send {
		margin-top: 16px;
	}
	.send-h {
		font-size: 13px;
		font-weight: 800;
		color: var(--muted);
		margin-bottom: 8px;
	}
	.preview {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 12px;
		border: 1px solid var(--border);
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
		bottom: calc(24px + var(--tab-h, 0px));
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
