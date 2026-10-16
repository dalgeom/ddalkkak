<script lang="ts">
	import { onMount } from 'svelte';
	import { track, seenOnce } from '$lib/analytics';
	import { FEEDBACK_MAX, type FeedbackKind } from '$lib/feedback';

	/**
	 * 결과 화면의 한 번 누름 반응(10/16) — 「재밌어요 · 어려웠어요 · 별로예요」. 누르면 그걸로 저장되고(feedback.ts quick),
	 * 하고 싶은 말이 있는 사람만 한 줄을 더 보낸다. 헤더 말풍선은 이틀 동안 4명이 열고 0명이 보냈다.
	 * 같은 결과(place)에는 기기마다 한 번만 묻는다 — 누른 뒤 다시 와도 고맙다는 줄만 남는다.
	 */
	let { place, question }: { place: string; question: string } = $props();

	const CHOICES: { kind: FeedbackKind; emoji: string; label: string }[] = [
		{ kind: 'fun', emoji: '😆', label: '재밌어요' },
		{ kind: 'hard', emoji: '😵', label: '어려웠어요' },
		{ kind: 'boring', emoji: '😐', label: '별로예요' }
	];
	const storeKey = $derived(`ddal.react:${place}`);

	let picked = $state<FeedbackKind | null>(null);
	let text = $state('');
	let stage = $state<'ask' | 'more' | 'sending' | 'thanks'>('ask');

	onMount(() => {
		try {
			if (localStorage.getItem(storeKey)) stage = 'thanks';
		} catch {
			/* 저장소가 막혀 있으면 매번 묻는다 */
		}
	});

	function post(kind: FeedbackKind, body: string) {
		return fetch('/api/feedback', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ kind, text: body, page: place, quick: true })
		});
	}

	async function pick(kind: FeedbackKind) {
		if (picked) return;
		picked = kind;
		stage = 'more';
		track('react_tap', { kind, place: place.split('?')[0] });
		try {
			localStorage.setItem(storeKey, kind);
		} catch {
			/* 기록 못 해도 반응은 보낸다 */
		}
		try {
			await post(kind, '');
		} catch {
			/* 한 번 누름은 실패해도 다시 묻지 않는다 */
		}
	}

	async function sendMore() {
		if (!picked || !text.trim()) return;
		stage = 'sending';
		try {
			const r = await post(picked, text);
			if (!r.ok) throw new Error(String(r.status));
			track('react_text', { kind: picked });
		} catch {
			/* 글이 안 가도 화면은 닫는다 — 반응은 이미 받았다 */
		}
		stage = 'thanks';
	}

	function seen(node: HTMLElement) {
		return seenOnce(node, 'react_seen');
	}
</script>

{#if stage === 'thanks' && !picked}
	<!-- 예전에 이미 답한 결과 — 아무것도 그리지 않는다 -->
{:else}
	<section class="react" use:seen>
		{#if stage === 'ask'}
			<p class="q">{question}</p>
			<div class="opts">
				{#each CHOICES as c (c.kind)}
					<button class="opt" onclick={() => pick(c.kind)}>
						<span class="em" aria-hidden="true">{c.emoji}</span>{c.label}
					</button>
				{/each}
			</div>
		{:else if stage === 'more' || stage === 'sending'}
			<p class="q">고마워요! 한마디 남겨 주면 더 큰 도움이 돼요</p>
			<div class="more">
				<input
					bind:value={text}
					maxlength={FEEDBACK_MAX}
					placeholder={picked === 'fun' ? '어떤 문제가 좋았어요?' : picked === 'hard' ? '몇 번이 어려웠어요?' : '어떤 점이 아쉬웠어요?'}
					onkeydown={(e) => e.key === 'Enter' && !e.isComposing && sendMore()}
				/>
				<button class="send" disabled={!text.trim() || stage === 'sending'} onclick={sendMore}>보내기</button>
			</div>
		{:else}
			<p class="q done">고마워요! 잘 받았어요 🙌</p>
		{/if}
	</section>
{/if}

<style>
	.react {
		margin-top: 14px;
		padding: 14px 14px 16px;
		border-radius: 16px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
	}
	.q {
		font-size: 14.5px;
		font-weight: 800;
		text-align: center;
		word-break: keep-all;
	}
	.q.done {
		color: var(--accent-text);
	}
	.opts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 10px;
	}
	.opt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		min-height: 64px;
		padding: 8px 4px;
		border-radius: 14px;
		border: 1px solid var(--border-strong);
		background: var(--panel-2);
		color: var(--text);
		font-size: 13.5px;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
	}
	.opt:active {
		background: var(--correct-bg);
		border-color: var(--accent);
	}
	.em {
		font-size: 24px;
		line-height: 1;
	}
	.more {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}
	input {
		flex: 1;
		min-width: 0;
		padding: 11px 12px;
		border-radius: 12px;
		border: 1.5px solid var(--border-strong);
		background: #fff;
		color: var(--text);
		font-size: 16px;
		font-family: inherit;
	}
	input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.send {
		flex: none;
		padding: 0 16px;
		border: none;
		border-radius: 12px;
		background: var(--accent);
		color: #fff;
		font-size: 15px;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
	}
	.send:disabled {
		background: var(--border-strong);
		color: var(--muted);
		cursor: default;
	}
</style>
