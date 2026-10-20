<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { chosungOf, isCorrect, categoryBySlug, type ChosungWord } from '$lib/chosung';
	import { track } from '$lib/analytics';

	/**
	 * 초성 한 낱말 풀기(2026-10-20, 단계 도전용). 채점은 초성 화면과 같다(chosung.ts isCorrect — 같은 분야에서
	 * 초성이 같은 낱말도 정답). 힌트(뜻풀이)는 눌러야 열린다. 다 끝나면 onsettle(맞았나)를 한 번 부른다.
	 * 낱말별 실측이 없어 단계를 사람이 매겼다(chosungTiers.ts) — 여기서는 낱말을 함께 보내 다음에 다시 잰다.
	 */
	let { word, onsettle }: { word: ChosungWord; onsettle: (ok: boolean) => void } = $props();

	let value = $state('');
	let hintOpen = $state(false);
	let tries = $state(0);
	let result = $state<'won' | 'shown' | null>(null);
	let msg = $state('');
	let inputEl = $state<HTMLInputElement>();
	let cat = $derived(categoryBySlug(word.category)?.name ?? '');

	onMount(() => {
		if (browser && window.matchMedia?.('(hover: hover)').matches) tick().then(() => inputEl?.focus());
	});

	function submit() {
		if (result || !value.trim()) return;
		if (isCorrect(word, value)) {
			result = 'won';
			msg = '딸깍! 맞혔어요';
			track('chstage_word', { word: word.word, ok: 1, hint: hintOpen ? 1 : 0 });
			onsettle(true);
		} else {
			tries++;
			msg = '아직이에요 — 힌트를 열어 볼까요?';
		}
	}
	function giveUp() {
		if (result) return;
		result = 'shown';
		msg = '정답을 확인했어요';
		track('chstage_word', { word: word.word, ok: 0, hint: hintOpen ? 1 : 0 });
		onsettle(false);
	}
</script>

<p class="cat">{cat}</p>
<div class="cho" aria-label="초성 {chosungOf(word.word).split('').join(' ')}">{chosungOf(word.word)}</div>

{#if hintOpen || result}
	<p class="hint"><span>힌트</span>{word.hint}</p>
{:else}
	<button class="hint-btn" onclick={() => (hintOpen = true)}>힌트 보기</button>
{/if}

{#if result}
	<p class="answer" class:ok={result === 'won'}>{msg} · 정답은 <b>{word.word}</b></p>
{:else}
	<input
		type="text"
		bind:this={inputEl}
		bind:value
		placeholder="낱말을 입력하세요"
		aria-label="정답 입력"
		autocomplete="off"
		onkeydown={(e) => e.key === 'Enter' && !e.isComposing && submit()}
	/>
	{#if msg}<p class="msg">{msg}</p>{/if}
	<div class="actions">
		<button class="btn-outline" onclick={giveUp}>모르겠어요</button>
		<button class="btn-primary" onclick={submit}>확인</button>
	</div>
{/if}

<style>
	.cat {
		margin-top: 14px;
		font-size: 14px;
		font-weight: 700;
		color: var(--muted);
		text-align: center;
	}
	.cho {
		margin: 6px 0 14px;
		text-align: center;
		font-size: 52px;
		font-weight: 900;
		letter-spacing: 10px;
		color: var(--accent-text);
		line-height: 1.2;
	}
	.hint-btn {
		display: block;
		margin: 0 auto 12px;
		padding: 8px 14px;
		border-radius: 10px;
		border: 1px solid var(--gold);
		background: var(--gold-bg);
		color: var(--gold-text);
		font-size: 13.5px;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
	}
	.hint {
		margin-bottom: 12px;
		padding: 10px 13px;
		background: var(--panel-2);
		border-left: 3px solid var(--accent);
		border-radius: 0 12px 12px 0;
		font-size: 14.5px;
		line-height: 1.7;
		word-break: keep-all;
	}
	.hint span {
		font-weight: 800;
		color: var(--accent-text);
		margin-right: 8px;
	}
	input[type='text'] {
		width: 100%;
		box-sizing: border-box;
		padding: 14px;
		border-radius: 12px;
		border: 1.5px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font-size: 17px;
		font-family: inherit;
	}
	input[type='text']:focus {
		outline: none;
		border-color: var(--accent);
	}
	.msg {
		margin-top: 8px;
		font-size: 14px;
		font-weight: 700;
		color: var(--danger);
	}
	.actions {
		display: flex;
		gap: 10px;
		margin-top: 12px;
	}
	.btn-outline,
	.btn-primary {
		flex: 1;
		padding: 13px;
		border-radius: 12px;
		font-size: 15px;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
	}
	.btn-outline {
		border: 1px solid var(--border-strong);
		background: transparent;
		color: var(--text);
	}
	.btn-primary {
		flex: 1.6;
		border: none;
		background: var(--accent);
		color: #fff;
		box-shadow: 0 4px 0 var(--accent-press);
	}
	.answer {
		margin-top: 4px;
		padding: 12px 14px;
		border-radius: 12px;
		background: var(--danger-bg);
		font-size: 15px;
		font-weight: 700;
		text-align: center;
		word-break: keep-all;
	}
	.answer.ok {
		background: var(--correct-bg);
	}
	.answer b {
		color: var(--accent-text);
	}
</style>
