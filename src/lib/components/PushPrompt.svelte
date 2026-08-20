<script lang="ts">
	import { onMount } from 'svelte';
	import { shouldOfferPush, notePushDismissed, stopOfferingPush, enablePush } from '$lib/push';
	import { track } from '$lib/analytics';

	/**
	 * 내일 알림 권유. 10문제를 막 끝낸 순간에만 묻는다.
	 *
	 * 알림 권한은 한 번 거부당하면 사이트 쪽에서 되살릴 수 없다. 그래서 첫 화면이 아니라
	 * 방금 재미를 느낀 자리에서, 무엇을 보낼지 먼저 밝히고 나서 묻는다.
	 */
	let { dayNum, streak = 0 }: { dayNum: number; streak?: number } = $props();

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

	let headline = $derived(
		streak >= 2 ? `연속 ${streak}일, 내일 아침에 알려드릴까요?` : '내일 아침에 알려드릴까요?'
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
