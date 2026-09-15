<script lang="ts">
	import { onMount } from 'svelte';
	import { shouldOfferPush, notePushDismissed, stopOfferingPush, enablePush } from '$lib/push';
	import { track } from '$lib/analytics';
	import type { Teaser } from '$lib/teaser';

	/**
	 * 내일 알림 권유. 10문제를 막 끝낸 순간에만 묻는다.
	 *
	 * 알림 권한은 한 번 거부당하면 사이트 쪽에서 되살릴 수 없다. 그래서 첫 화면이 아니라
	 * 방금 재미를 느낀 자리에서, 무엇을 보낼지 먼저 밝히고 나서 묻는다.
	 *
	 * tomorrow — 내일 발견형 문제의 첫 예시 한 줄(teaser.ts). 9/15에 카드 안으로 들였다.
	 * 8/01~9/14에 이 카드가 뜬 25명 중 3명(12%)만 켰는데, 켤 이유(내일 무엇이 오나)는 결과 화면
	 * 맨 아래 예고에 따로 있었다. 이유를 버튼 바로 위에 둔다. 효과는 날짜로 가른다 — 그 전 12%.
	 */
	let {
		dayNum,
		streak = 0,
		tomorrow = null
	}: { dayNum: number; streak?: number; tomorrow?: Teaser | null } = $props();

	let show = $state(false);
	let busy = $state(false);
	let done = $state(false);

	onMount(() => {
		if (!shouldOfferPush(dayNum)) return;
		show = true;
		track('push_offer', { streak });
	});

	async function allow() {
		busy = true;
		track('push_click');
		const state = await enablePush();
		busy = false;
		track('push_result', { state });
		if (state === 'granted') {
			done = true;
			stopOfferingPush();
		} else if (state === 'denied') {
			// 브라우저가 막았으면 다시 물어봐야 창조차 뜨지 않는다
			stopOfferingPush();
			show = false;
		}
	}

	function close() {
		track('push_dismiss');
		notePushDismissed(dayNum);
		show = false;
	}

	let peek = $derived(tomorrow?.line ? tomorrow : null);
	let headline = $derived(
		peek
			? streak >= 2
				? `연속 ${streak}일, 내일 이 문제가 열리면 알려드릴까요?`
				: '내일 이 문제가 열리면 알려드릴까요?'
			: streak >= 2
				? `연속 ${streak}일, 내일 아침에 알려드릴까요?`
				: '내일 아침에 알려드릴까요?'
	);
</script>

{#if show}
	<section class="push" class:ok={done}>
		{#if done}
			<p class="ok-msg">내일 아침 8시에 알려드릴게요. 오늘 기록은 이어집니다.</p>
		{:else}
			<div class="top">
				<h2>{headline}</h2>
				<button class="x" onclick={close} aria-label="닫기">✕</button>
			</div>
			<!-- 한 줄로만 — 버튼이 접히는 선 위에 서야 하는 카드다(+page.svelte의 이 카드 주석) -->
			{#if peek}
				<p class="peek"><span>내일의 {peek.chip}</span><b>{peek.line}</b></p>
			{/if}
			<p class="why">
				하루 한 번, 새 문제가 올라왔을 때만 보냅니다. 그 외에는 아무것도 보내지 않아요.
			</p>
			<button class="go" onclick={allow} disabled={busy}>
				{busy ? '설정하는 중…' : '내일 아침에 알림 받기'}
			</button>
		{/if}
	</section>
{/if}

<style>
	.push {
		margin-top: 12px;
		background: var(--panel);
		border: 2px solid var(--accent);
		border-radius: 16px;
		padding: 16px;
	}
	.push.ok {
		border-color: var(--border);
	}
	.top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}
	h2 {
		font-size: 16.5px;
		font-weight: 800;
		line-height: 1.4;
		word-break: keep-all;
	}
	.x {
		flex: none;
		width: 28px;
		height: 28px;
		border-radius: 9px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--muted-2);
		font-size: 11px;
		font-weight: 800;
		cursor: pointer;
		font-family: inherit;
	}
	.peek {
		margin-top: 9px;
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 4px 10px;
		padding: 8px 12px;
		border: 1px dashed var(--border-strong);
		border-radius: 11px;
		background: var(--panel-2);
	}
	.peek span {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--accent-2);
	}
	.peek b {
		font-size: 17px;
		font-weight: 800;
		white-space: pre;
		font-variant-numeric: tabular-nums;
	}
	.why {
		margin-top: 6px;
		font-size: 13.5px;
		color: var(--muted);
		line-height: 1.7;
		word-break: keep-all;
	}
	.ok-msg {
		font-size: 14.5px;
		font-weight: 700;
		line-height: 1.7;
		word-break: keep-all;
	}
	.go {
		width: 100%;
		margin-top: 13px;
		min-height: 52px;
		border-radius: 13px;
		background: var(--accent);
		color: #fff;
		font-size: 16px;
		font-weight: 800;
		border: none;
		box-shadow: 0 5px 0 var(--accent-press);
		cursor: pointer;
		font-family: inherit;
	}
	.go:disabled {
		opacity: 0.6;
		box-shadow: none;
	}
</style>
