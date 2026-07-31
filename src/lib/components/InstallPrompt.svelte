<script lang="ts">
	import { onMount } from 'svelte';
	import {
		installEvent,
		isIOSInstallable,
		iosBrowser,
		iosInstallSteps,
		shouldOfferInstall,
		noteInstallDismissed,
		stopOfferingInstall,
		type Step
	} from '$lib/pwa';
	import { track } from '$lib/analytics';

	/**
	 * 홈 화면 추가 권유.
	 *
	 * 이게 사실상 유일한 재방문 경로다 — 설치하지 않으면 다음 날 다시 오려면
	 * 브라우저를 열고 주소를 기억해서 직접 쳐야 하는데, 그렇게 하는 사람은 거의 없다.
	 * 그래서 10문제를 막 끝낸 순간(기록을 지키고 싶은 마음이 가장 큰 때)에 권한다.
	 *
	 * 전면을 덮지는 않는다 — 본문을 가리는 앱 설치 안내는 검색 순위에서 불이익을 받는다.
	 */
	let { dayNum, streak = 0 }: { dayNum: number; streak?: number } = $props();

	let mode = $state<'none' | 'button' | 'ios'>('none');
	let steps = $state<Step[]>([]);
	let closed = $state(false);

	onMount(() => {
		if (!shouldOfferInstall(dayNum)) return;
		const ua = navigator.userAgent;
		if (isIOSInstallable(ua)) {
			mode = 'ios';
			steps = iosInstallSteps(iosBrowser(ua));
		}
		if (mode !== 'none') track('install_offer', { mode });
	});

	// 크롬 계열은 설치 가능 시점이 늦게 올 수 있어 이벤트가 오면 버튼형으로 바꾼다
	$effect(() => {
		if ($installEvent && mode === 'none' && shouldOfferInstall(dayNum)) {
			mode = 'button';
			track('install_offer', { mode: 'button' });
		}
	});

	async function install() {
		const e = $installEvent;
		if (!e) return;
		track('install_click');
		await e.prompt();
		const { outcome } = await e.userChoice;
		track('install_result', { outcome });
		if (outcome === 'accepted') {
			stopOfferingInstall();
			closed = true;
		}
	}

	function close() {
		track('install_dismiss', { mode });
		noteInstallDismissed(dayNum);
		closed = true;
	}

	let show = $derived(mode !== 'none' && !closed);
	let headline = $derived(
		streak >= 2 ? `연속 ${streak}일, 내일도 이어가려면` : '내일도 잊지 않고 풀려면'
	);
</script>

{#if show}
	<section class="ins">
		<div class="top">
			<h2>{headline}</h2>
			<button class="x" onclick={close} aria-label="닫기">✕</button>
		</div>
		<p class="why">
			홈 화면에 추가해 두면 앱처럼 눌러서 바로 들어와요. 주소를 외울 필요도, 검색할 필요도 없어요.
		</p>

		{#if mode === 'button'}
			<button class="go" onclick={install}>홈 화면에 딸깍 추가하기</button>
		{:else}
			<ol class="steps">
				{#each steps as s, i (i)}
					<li>
						<span class="n">{i + 1}</span>
						{#if s.icon === 'share'}
							<span class="ico" aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
									<path d="M12 15V3" /><path d="M8 7l4-4 4 4" />
									<path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
								</svg>
							</span>
						{:else if s.icon === 'dots'}
							<span class="ico" aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="currentColor">
									<circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
								</svg>
							</span>
						{:else if s.icon === 'plus'}
							<span class="ico" aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
									<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
									<path d="M12 8v8M8 12h8" />
								</svg>
							</span>
						{/if}
						<span class="t">{s.text}</span>
					</li>
				{/each}
			</ol>
			<p class="note">아이폰은 홈 화면 앱이 기록을 따로 저장해요 — 추가한 뒤부터 그곳에 쌓입니다.</p>
		{/if}
	</section>
{/if}

<style>
	.ins {
		margin-top: 12px;
		background: var(--panel);
		border: 2px solid var(--accent);
		border-radius: 16px;
		padding: 16px;
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
	.go:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 var(--accent-press);
	}

	/* 글로만 쓰면 버튼을 못 찾는다 — 눌러야 할 모양을 그려준다 */
	.steps {
		list-style: none;
		margin: 13px 0 0;
		padding: 13px;
		background: var(--panel-2);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 11px;
	}
	.steps li {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.n {
		flex: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 11.5px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ico {
		flex: none;
		width: 30px;
		height: 30px;
		border-radius: 8px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		color: var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ico svg {
		width: 17px;
		height: 17px;
	}
	.t {
		font-size: 13.5px;
		font-weight: 600;
		line-height: 1.5;
		word-break: keep-all;
	}
	.note {
		margin-top: 9px;
		font-size: 12px;
		color: var(--muted-2);
		line-height: 1.6;
		word-break: keep-all;
	}
</style>
