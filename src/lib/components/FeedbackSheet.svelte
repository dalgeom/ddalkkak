<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { track } from '$lib/analytics';
	import { kstDayNumber } from '$lib/game';
	import { FEEDBACK_KINDS, FEEDBACK_MAX, FEEDBACK_MIN, type FeedbackKind } from '$lib/feedback';

	/**
	 * 의견 보내기(2026-10-14) — 헤더 종 옆 말풍선. 누르면 아래에서 시트가 올라온다(feedback.ts).
	 * 주제를 고르고 한 줄이라도 적으면 보낼 수 있다. 어느 화면에서 보냈는지는 함께 저장한다 —
	 * 「이 문제 재미없어요」가 어느 문제인지 알아야 고칠 수 있다. 메인이면 그날 문제 번호(day)를 붙인다.
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
	function close() {
		open = false;
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

	// 새 소식 「의견 보내러 가기」(?feedback=1)로 들어오면 바로 연다. 주소에서는 지워 새로고침 때 또 열리지 않게
	$effect(() => {
		if (page.url.searchParams.get('feedback') !== '1') return;
		const u = new URL(page.url);
		u.searchParams.delete('feedback');
		untrack(() => {
			replaceState(u.pathname + u.search, {});
			show();
		});
	});

	function onKey(e: KeyboardEvent) {
		if (open && e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKey} />

<button class="fbtn" aria-label="의견 보내기" onclick={show}>
	<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4.5 3.5v-3.5h-2.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" /><path d="M8.5 10.2h7M8.5 13h4.5" /></svg>
</button>

{#if open}
	<div class="dim" role="presentation" onclick={close}></div>
	<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="fb-h">
		<div class="grip" aria-hidden="true"></div>
		<button class="x" aria-label="닫기" onclick={close}>✕</button>
		{#if status === 'done'}
			<div class="done">
				<p class="big" aria-hidden="true">🙌</p>
				<h2 id="fb-h">고마워요! 잘 받았어요</h2>
				<p class="sub">보내 주신 의견은 하나하나 읽고 딸깍을 고치는 데 써요.</p>
				<button class="send" onclick={close}>확인</button>
			</div>
		{:else}
			<h2 id="fb-h">의견을 보내주세요</h2>
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
	</div>
{/if}

<style>
	.fbtn {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
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
	.dim {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(30, 26, 20, 0.36);
		animation: fade 0.2s ease-out;
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 61;
		max-width: 520px;
		margin: 0 auto;
		background: var(--panel);
		border-radius: 22px 22px 0 0;
		padding: 10px 18px calc(18px + env(safe-area-inset-bottom));
		box-shadow: 0 -10px 30px rgba(30, 26, 20, 0.18);
		animation: up 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
		max-height: 88dvh;
		overflow-y: auto;
	}
	.grip {
		width: 40px;
		height: 4px;
		border-radius: 3px;
		background: var(--border-strong);
		margin: 0 auto 12px;
	}
	.x {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		border: none;
		background: none;
		color: var(--muted);
		font-size: 16px;
		cursor: pointer;
	}
	h2 {
		font-size: 19px;
		font-weight: 900;
		padding-right: 36px;
	}
	.sub {
		margin-top: 6px;
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
	.done h2 {
		padding-right: 0;
	}
	.big {
		font-size: 40px;
		line-height: 1;
		margin-bottom: 8px;
	}
	@keyframes up {
		from {
			transform: translateY(100%);
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
</style>
