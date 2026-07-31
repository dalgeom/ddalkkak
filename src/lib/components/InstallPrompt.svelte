<script lang="ts">
	import { onMount } from 'svelte';
	import {
		installEvent,
		isInAppUA,
		platformOf,
		iosBrowser,
		installSteps,
		shouldOfferInstall,
		noteInstallDismissed,
		stopOfferingInstall,
		type Step,
		type Platform
	} from '$lib/pwa';
	import InstallSteps from './InstallSteps.svelte';
	import { track } from '$lib/analytics';

	/**
	 * 홈 화면 추가 권유. 10문제를 막 끝낸 순간(기록을 지키고 싶은 마음이 가장 큰 때)에 권한다.
	 * 전면을 덮지는 않는다 — 본문을 가리는 설치 안내는 검색 순위에서 불이익을 받는다.
	 */
	let { dayNum, streak = 0 }: { dayNum: number; streak?: number } = $props();

	let mode = $state<'none' | 'button' | 'steps'>('none');
	let steps = $state<Step[]>([]);
	let platform = $state<Platform>('desktop');
	let closed = $state(false);

	onMount(() => {
		if (!shouldOfferInstall(dayNum)) return;
		const ua = navigator.userAgent;
		if (isInAppUA(ua)) return; // 인앱은 홈 화면 추가 자체가 안 된다
		platform = platformOf(ua, navigator.maxTouchPoints ?? 0);
		const s = installSteps(platform, iosBrowser(ua));

		if (platform === 'iphone' || platform === 'ipad') {
			steps = s;
			mode = 'steps';
			track('install_offer', { mode: 'steps', platform });
			return;
		}
		// 안드로이드는 설치 버튼 이벤트가 조금 늦게 오기도 한다. 잠깐 기다렸다가
		// 끝내 오지 않으면(파이어폭스 등) 수동 경로라도 안내한다 — 아무것도 안 뜨는 게 최악이다.
		if (platform === 'android') {
			setTimeout(() => {
				if (mode === 'none' && !closed && s.length) {
					steps = s;
					mode = 'steps';
					track('install_offer', { mode: 'steps', platform: 'android' });
				}
			}, 1500);
		}
	});

	// 설치 버튼을 쓸 수 있으면 언제든 그쪽이 낫다.
	// 단 iOS는 설치 API가 없으므로 단계 안내를 버튼으로 덮으면 안 된다
	// (엔진이 크로미움인 테스트 환경에서 이벤트가 떠 iPad 안내가 버튼으로 바뀌는 걸 발견했다).
	$effect(() => {
		const iosLike = platform === 'iphone' || platform === 'ipad';
		if ($installEvent && !iosLike && mode !== 'button' && !closed && shouldOfferInstall(dayNum)) {
			mode = 'button';
			track('install_offer', { mode: 'button', platform });
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
	// 데스크톱에서는 '홈 화면'이 아니라 앱으로 설치된다
	let label = $derived(platform === 'desktop' ? '딸깍 앱으로 설치하기' : '홈 화면에 딸깍 추가하기');
</script>

{#if show}
	<section class="ins">
		<div class="top">
			<h2>{headline}</h2>
			<button class="x" onclick={close} aria-label="닫기">✕</button>
		</div>
		<p class="why">
			{platform === 'desktop'
				? '설치해 두면 창 하나로 바로 열려요. 주소를 외울 필요도, 검색할 필요도 없어요.'
				: '홈 화면에 추가해 두면 앱처럼 눌러서 바로 들어와요. 주소를 외울 필요도, 검색할 필요도 없어요.'}
		</p>

		{#if mode === 'button'}
			<button class="go" onclick={install}>{label}</button>
		{:else}
			<InstallSteps {steps} />
			{#if platform === 'iphone' || platform === 'ipad'}
				<p class="note">아이폰은 홈 화면 앱이 기록을 따로 저장해요 — 추가한 뒤부터 그곳에 쌓입니다.</p>
			{/if}
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
	.note {
		margin-top: 9px;
		font-size: 12px;
		color: var(--muted-2);
		line-height: 1.6;
		word-break: keep-all;
	}
</style>
