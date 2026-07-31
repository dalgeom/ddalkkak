<script lang="ts">
	import { onMount } from 'svelte';
	import {
		installEvent,
		isInAppUA,
		platformOf,
		iosBrowser,
		installSteps,
		shouldOfferInstall,
		stopOfferingInstall,
		type Step
	} from '$lib/pwa';
	import InstallSteps from './InstallSteps.svelte';
	import { track } from '$lib/analytics';

	/**
	 * 홈 화면의 얇은 설치 안내.
	 *
	 * 결과 화면 권유는 10문제를 끝낸 사람만 본다 — 중간에 나가는 사람이 더 많다.
	 * 그래서 한 번 이상 와 본 사람(연속 기록이 있는 사람)에게만 홈에서도 한 줄 보여준다.
	 * 첫 방문자에게는 뜨지 않으므로 검색으로 들어온 사람의 첫인상을 방해하지 않는다.
	 */
	/** returning: 오늘 이전에 푼 적이 있는 사람 — 완주 여부와 무관하게 잡는다 */
	let { dayNum, returning = false }: { dayNum: number; returning?: boolean } = $props();

	let ready = $state(false);
	let closed = $state(false);
	let opened = $state(false);
	let steps = $state<Step[]>([]);
	let iosLike = $state(false);

	onMount(() => {
		const ua = navigator.userAgent;
		if (isInAppUA(ua)) return;
		const p = platformOf(ua, navigator.maxTouchPoints ?? 0);
		iosLike = p === 'iphone' || p === 'ipad';
		steps = installSteps(p, iosBrowser(ua));
	});

	/* returning은 부모가 onMount에서 읽어 넘긴다 — 자식 onMount는 그보다 먼저 실행되므로
	   그때 한 번만 판단하면 영영 false로 남는다. 값이 도착하면 다시 따지도록 반응형으로 둔다. */
	$effect(() => {
		if (closed || !returning) return;
		if (!shouldOfferInstall(dayNum)) return;
		// 설치 버튼을 띄울 수 있거나(안드로이드 크롬), 수동 경로라도 안내할 수 있을 때만
		if ($installEvent || steps.length) ready = true;
	});

	async function act() {
		// iOS는 설치 API가 없다 — 이벤트가 있어 보여도 단계 안내로 간다
		const e = iosLike ? null : $installEvent;
		if (e) {
			track('install_hint_click', { via: 'button' });
			await e.prompt();
			const { outcome } = await e.userChoice;
			track('install_result', { outcome, from: 'hint' });
			if (outcome === 'accepted') {
				stopOfferingInstall();
				closed = true;
			}
			return;
		}
		// 설치 API가 없는 환경(iOS 등) — 이 자리에서 단계를 펼친다.
		// 예전엔 결과 화면의 안내로 스크롤했는데, 홈에는 그 요소가 없어 아무 일도 안 일어났다.
		track('install_hint_click', { via: 'steps' });
		opened = !opened;
	}
</script>

{#if ready && !closed}
	<div class="wrap">
		<button class="hint" onclick={act} aria-expanded={opened}>
			<span class="ico" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
					<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
					<path d="M12 8v8M8 12h8" />
				</svg>
			</span>
			<span class="t">홈 화면에 추가하고 매일 바로 열기</span>
			<span class="go" aria-hidden="true">{opened ? '▾' : '→'}</span>
		</button>
		{#if opened}
			<InstallSteps {steps} />
		{/if}
	</div>
{/if}

<style>
	.wrap {
		margin-top: 12px;
		text-align: left;
	}
	.hint {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
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
