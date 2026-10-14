<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { track } from '$lib/analytics';
	import { kstDayNumber } from '$lib/game';
	import { FEEDBACK_KINDS, FEEDBACK_MAX, FEEDBACK_MIN, type FeedbackKind } from '$lib/feedback';
	import BottomSheet from './BottomSheet.svelte';

	/**
	 * 의견 보내기(2026-10-14) — 헤더 종 옆 말풍선. 누르면 아래에서 시트가 올라온다(feedback.ts).
	 * 주제를 고르고 한 줄이라도 적으면 보낼 수 있다. 어느 화면에서 보냈는지는 함께 저장한다 —
	 * 「이 문제 재미없어요」가 어느 문제인지 알아야 고칠 수 있다. 메인이면 그날 문제 번호(day)를 붙인다.
	 * 시트 동작(끌어 닫기 · 뒤로가기 · 스크롤 잠금)은 BottomSheet.
	 */
	let open = $state(false);
	let kind = $state<FeedbackKind | null>(null);
	let text = $state('');
	let hp = $state('');
	let status = $state<'idle' | 'sending' | 'done' | 'fail'>('idle');

	let ready = $derived(!!kind && text.trim().length >= FEEDBACK_MIN && status !== 'sending');

	function where(): string {
		const p = page.url.pathname;
		return p === '/' ? `/?day=${kstDayNumber(Date.now())}` : p + page.url.search;
	}

	function show() {
		open = true;
		if (status === 'done') {
			status = 'idle';
			kind = null;
			text = '';
		}
		track('feedback_open', { from: page.url.pathname });
	}
	async function send() {
		if (!ready || !kind) return;
		status = 'sending';
		try {
			const r = await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ kind, text, page: where(), hp })
			});
			if (!r.ok) throw new Error(String(r.status));
			status = 'done';
			track('feedback_send', { kind });
		} catch {
			status = 'fail';
		}
	}

	// 새 소식 「의견 보내러 가기」(?feedback=1)로 들어오면 바로 연다. 주소에서는 지워 새로고침 때 또 열리지 않게.
	// afterNavigate — 첫 진입과 사이트 안 이동 둘 다, 라우터가 준비된 뒤에 돈다(그 전에 replaceState를 부르면 예외)
	afterNavigate(({ to }) => {
		if (to?.url.searchParams.get('feedback') !== '1') return;
		const u = new URL(to.url);
		u.searchParams.delete('feedback');
		replaceState(u.pathname + u.search, {});
		show();
	});
</script>

<button class="fbtn" aria-label="의견 보내기" onclick={show}>
	<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4.5 3.5v-3.5h-2.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" /><path d="M8.5 10.2h7M8.5 13h4.5" /></svg>
	<span>의견</span>
</button>

<BottomSheet bind:open id="feedback" title={status === 'done' ? '' : '의견을 보내주세요'}>
	{#if status === 'done'}
		<div class="done">
			<p class="big" aria-hidden="true">🙌</p>
			<h2>고마워요! 잘 받았어요</h2>
			<p class="sub">보내 주신 의견은 하나하나 읽고 딸깍을 고치는 데 써요.</p>
			<button class="send" onclick={() => (open = false)}>확인</button>
		</div>
	{:else}
		<p class="sub">재미없던 문제, 너무 어려운 문제, 있었으면 하는 문제나 기능까지 편하게 적어 주세요. 이름이나 연락처는 받지 않아요.</p>

		<div class="kinds" role="radiogroup" aria-label="어떤 의견인가요">
			{#each FEEDBACK_KINDS as k (k.key)}
				<button role="radio" aria-checked={kind === k.key} class="kind" class:on={kind === k.key} onclick={() => (kind = k.key)}>{k.label}</button>
			{/each}
		</div>

		<label class="box">
			<span class="sr-only">하고 싶은 말</span>
			<textarea
				bind:value={text}
				maxlength={FEEDBACK_MAX}
				rows="5"
				placeholder={'예) 오늘 3번 문제는 답이 두 개 같아요\n예) 초성 퀴즈에 영화 분야가 있으면 좋겠어요'}
			></textarea>
			<span class="count">{text.length} / {FEEDBACK_MAX}</span>
		</label>
		<!-- 사람에게는 안 보이는 칸 — 자동 입력 봇만 채운다 -->
		<input class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" bind:value={hp} />

		{#if status === 'fail'}
			<p class="err" role="alert">보내지 못했어요. 적은 글은 그대로 있으니 잠시 뒤 다시 눌러 주세요.</p>
		{/if}
		<button class="send" disabled={!ready} onclick={send}>
			{status === 'sending' ? '보내는 중…' : !kind ? '어떤 의견인지 골라 주세요' : text.trim().length < FEEDBACK_MIN ? '하고 싶은 말을 적어 주세요' : '보내기'}
		</button>
	{/if}
</BottomSheet>

<style>
	/* 아이콘만으로는 무엇인지 몰라 글자를 붙인다 */
	.fbtn {
		height: 40px;
		padding: 0 8px;
		gap: 4px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13.5px;
		font-weight: 800;
		font-family: inherit;
		color: var(--muted);
		background: none;
		border: none;
		cursor: pointer;
	}
	.fbtn svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.fbtn:hover {
		color: var(--text);
	}
	h2 {
		font-size: 19px;
		font-weight: 900;
	}
	.sub {
		margin-top: 2px;
		font-size: 13.5px;
		line-height: 1.65;
		color: var(--muted);
		word-break: keep-all;
	}
	.kinds {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		margin-top: 14px;
	}
	.kind {
		min-height: 42px;
		padding: 8px 10px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel-2);
		color: var(--text);
		font-size: 14px;
		font-weight: 700;
		font-family: inherit;
		text-align: center;
		word-break: keep-all;
		cursor: pointer;
	}
	.kind:last-child:nth-child(odd) {
		grid-column: 1 / -1;
	}
	.kind.on {
		background: var(--correct-bg);
		border-color: var(--accent);
		color: var(--accent-text);
	}
	.box {
		display: block;
		position: relative;
		margin-top: 12px;
	}
	textarea {
		display: block;
		width: 100%;
		min-height: 120px;
		resize: vertical;
		padding: 12px 14px 26px;
		border-radius: 14px;
		border: 1.5px solid var(--border-strong);
		background: #fff;
		color: var(--text);
		font-size: 16px;
		line-height: 1.6;
		font-family: inherit;
	}
	textarea:focus {
		outline: none;
		border-color: var(--accent);
	}
	textarea::placeholder {
		color: var(--muted-2);
		opacity: 0.8;
	}
	.count {
		position: absolute;
		right: 12px;
		bottom: 8px;
		font-size: 12px;
		color: var(--muted-2);
		font-variant-numeric: tabular-nums;
	}
	.hp {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		opacity: 0;
	}
	.err {
		margin-top: 10px;
		font-size: 13.5px;
		font-weight: 700;
		color: var(--danger);
		word-break: keep-all;
	}
	.send {
		width: 100%;
		margin-top: 12px;
		padding: 14px;
		border: none;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 16px;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
		box-shadow: 0 4px 0 var(--accent-press);
	}
	.send:disabled {
		background: var(--border-strong);
		color: var(--muted);
		box-shadow: none;
		cursor: default;
	}
	.done {
		text-align: center;
		padding: 8px 0 2px;
	}
	.big {
		font-size: 40px;
		line-height: 1;
		margin-bottom: 8px;
	}
</style>
