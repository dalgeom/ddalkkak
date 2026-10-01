<script lang="ts">
	import type { Mark } from '$lib/game';
	import { track } from '$lib/analytics';
	import { sendUrl, sendText, markParam } from '$lib/sendProblem';

	/**
	 * 「이 문제 친구에게 보내기」 — 판정이 난 뒤 해설 아래에 붙는다(sendProblem.ts 주석).
	 *
	 * 휴대폰은 공유 시트(카톡이 맨 앞에 뜬다), 데스크톱은 복사. 데스크톱에서 시트를 띄우면
	 * 대화방 앱이 없어 닫게 된다(+page.svelte의 「복사우선」과 같은 판단).
	 */
	let { id, mark, from }: { id: string; mark: Mark | null; from: 'daily' | 'play' | 'q' } = $props();

	let note = $state('');

	async function copy(text: string): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// clipboard API가 없는 구형·인앱 브라우저
			try {
				const ta = document.createElement('textarea');
				ta.value = text;
				ta.style.position = 'fixed';
				ta.style.opacity = '0';
				document.body.appendChild(ta);
				ta.select();
				const ok = document.execCommand('copy');
				ta.remove();
				return ok;
			} catch {
				return false;
			}
		}
	}

	async function send() {
		const text = sendText(mark, sendUrl(location.origin, id, mark));
		const touch = window.matchMedia('(pointer: coarse)').matches;
		track('problem_send_click', { from, id, r: mark ? markParam(mark) : '' });
		let outcome = 'failed';
		if (touch && navigator.share) {
			try {
				await navigator.share({ text });
				outcome = 'shared';
			} catch (e) {
				outcome = (e as Error)?.name === 'AbortError' ? 'canceled' : 'failed';
			}
		}
		if (outcome === 'failed') outcome = (await copy(text)) ? 'copied' : 'failed';
		track('problem_send_result', { from, outcome });
		note =
			outcome === 'copied'
				? '링크를 복사했어요. 대화방에 붙여 넣으세요.'
				: outcome === 'failed'
					? '보내기에 실패했어요.'
					: '';
	}
</script>

<div class="send">
	<button class="send-btn" onclick={send}>
		<span aria-hidden="true">🤔</span> 친구는 풀까요? 이 문제 보내기
	</button>
	{#if note}<p class="send-note" role="status">{note}</p>{/if}
</div>

<style>
	.send {
		margin-top: 12px;
	}
	.send-btn {
		width: 100%;
		min-height: 46px;
		padding: 10px 14px;
		border-radius: 12px;
		border: 1.5px dashed var(--accent);
		background: var(--correct-bg);
		color: var(--accent-text);
		font-family: inherit;
		font-size: 14.5px;
		font-weight: 800;
		cursor: pointer;
		word-break: keep-all;
	}
	.send-note {
		margin: 6px 2px 0;
		font-size: 12.5px;
		color: var(--muted);
		text-align: center;
	}
</style>
