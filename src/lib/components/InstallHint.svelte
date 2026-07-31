<script lang="ts">
	import { onMount } from 'svelte';
	import { installEvent, isIOSInstallable, shouldOfferInstall, stopOfferingInstall } from '$lib/pwa';
	import { track } from '$lib/analytics';

	/**
	 * 홈 화면의 얇은 설치 안내.
	 *
	 * 결과 화면 권유는 10문제를 끝낸 사람만 본다 — 중간에 나가는 사람이 더 많다.
	 * 그래서 이미 한 번 이상 와 본 사람(연속 기록이 있는 사람)에게만 홈에서도 한 줄 보여준다.
	 * 첫 방문자에게는 뜨지 않으므로 검색으로 들어온 사람의 첫인상을 방해하지 않는다.
	 */
	let { dayNum, streak = 0 }: { dayNum: number; streak?: number } = $props();

	let ready = $state(false);
	let closed = $state(false);
	let canIOS = $state(false);

	onMount(() => {
		canIOS = isIOSInstallable(navigator.userAgent);
	});

	/* streak은 부모가 onMount에서 읽어 넘긴다 — 자식 onMount는 그보다 먼저 실행되므로
	   그때 한 번만 판단하면 영영 0으로 남는다. 값이 도착하면 다시 따지도록 반응형으로 둔다. */
	$effect(() => {
		if (closed || streak < 1) return;
		if (!shouldOfferInstall(dayNum)) return;
		// 설치 버튼을 띄울 수 있거나(안드로이드), 안내라도 할 수 있는 환경(iOS)에서만
		if (canIOS || $installEvent) ready = true;
	});

	async function act() {
		const e = $installEvent;
		track('install_hint_click', { via: e ? 'button' : 'scroll' });
		if (e) {
			await e.prompt();
			const { outcome } = await e.userChoice;
			track('install_result', { outcome, from: 'hint' });
			if (outcome === 'accepted') {
				stopOfferingInstall();
				closed = true;
			}
			return;
		}
		// iOS는 설치 API가 없다 — 결과 화면의 단계별 안내로 데려간다
		document.querySelector('.ins')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
</script>

{#if ready && !closed}
	<button class="hint" onclick={act}>
		<span class="ico" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
				<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
				<path d="M12 8v8M8 12h8" />
			</svg>
		</span>
		<span class="t">홈 화면에 추가하고 매일 바로 열기</span>
		<span class="go" aria-hidden="true">→</span>
	</button>
{/if}

<style>
	.hint {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		margin-top: 12px;
		padding: 11px 13px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent);
		border-radius: 12px;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
	}
	.ico {
		flex: none;
		width: 26px;
		height: 26px;
		border-radius: 7px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		color: var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ico svg {
		width: 15px;
		height: 15px;
	}
	.t {
		flex: 1;
		font-size: 13px;
		font-weight: 700;
		color: var(--text);
		word-break: keep-all;
	}
	.go {
		flex: none;
		font-size: 15px;
		font-weight: 800;
		color: var(--accent);
	}
</style>
