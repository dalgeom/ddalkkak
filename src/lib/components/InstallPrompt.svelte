<script lang="ts">
	import { onMount } from 'svelte';
	import {
		installEvent,
		isStandalone,
		isIOSInstallable,
		iosBrowser,
		iosInstallSteps
	} from '$lib/pwa';
	import { track } from '$lib/analytics';

	/**
	 * 홈 화면 추가 권유. 처음 들어온 사람에게 들이대면 방해만 되므로
	 * 10문제를 끝낸 직후(기록이 막 생긴 순간)에만 보여준다.
	 */
	const KEY = 'ddal.install.hide';

	let mode = $state<'none' | 'button' | 'ios'>('none');
	let hidden = $state(true);
	let steps = $state<string[]>([]);

	onMount(() => {
		if (isStandalone()) return;
		try {
			if (localStorage.getItem(KEY)) return;
		} catch {
			/* 저장소가 막혀 있으면 그냥 보여준다 */
		}
		hidden = false;
		const ua = navigator.userAgent;
		if (isIOSInstallable(ua)) {
			mode = 'ios';
			// 공유 버튼 위치가 브라우저마다 달라 경로를 갈라 안내한다
			steps = iosInstallSteps(iosBrowser(ua));
		}
	});

	// 크롬 계열은 설치 가능해지는 시점이 늦을 수 있어 이벤트가 오면 버튼으로 바꾼다
	$effect(() => {
		if ($installEvent && mode !== 'ios') mode = 'button';
	});

	async function install() {
		const e = $installEvent;
		if (!e) return;
		track('install_click');
		await e.prompt();
		const { outcome } = await e.userChoice;
		track('install_result', { outcome });
		if (outcome === 'accepted') dismiss();
	}

	function dismiss() {
		hidden = true;
		try {
			localStorage.setItem(KEY, '1');
		} catch {
			/* 무시 */
		}
	}
</script>

{#if !hidden && mode !== 'none'}
	<aside class="install">
		<div class="head">
			<b>홈 화면에 딸깍 추가하기</b>
			<button class="x" onclick={dismiss} aria-label="닫기">✕</button>
		</div>
		<p class="d">
			앱처럼 바로 열리고, 매일 같은 자리에서 이어 풀 수 있어요.
		</p>
		{#if mode === 'button'}
			<button class="go" onclick={install}>홈 화면에 추가</button>
		{:else}
			<ol class="steps">
				{#each steps as s, i (i)}
					<li><span class="n">{i + 1}</span><b>{s}</b></li>
				{/each}
			</ol>
			<!-- 아이폰은 홈 화면 앱이 브라우저와 저장소를 공유하지 않는다.
			     모르고 추가했다가 기록이 0으로 보이면 더 나쁜 경험이라 미리 알린다. -->
			<p class="warn">
				아이폰은 홈 화면 앱과 브라우저가 기록을 따로 저장해요. 지금까지 쌓인 기록은 함께 옮겨가지
				않고, 추가한 뒤부터 그곳에 쌓입니다.
			</p>
		{/if}
	</aside>
{/if}

<style>
	.install {
		margin-top: 12px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-left: 3px solid var(--accent);
		border-radius: 14px;
		padding: 14px 15px;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.head b {
		font-size: 14.5px;
		font-weight: 800;
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
	.d {
		margin-top: 5px;
		font-size: 13px;
		color: var(--muted);
		line-height: 1.65;
		word-break: keep-all;
	}
	.go {
		width: 100%;
		margin-top: 11px;
		min-height: 46px;
		border-radius: 12px;
		background: var(--accent);
		color: #fff;
		font-size: 14.5px;
		font-weight: 800;
		border: none;
		box-shadow: 0 4px 0 var(--accent-press);
		cursor: pointer;
		font-family: inherit;
	}
	.go:active {
		transform: translateY(2px);
		box-shadow: 0 2px 0 var(--accent-press);
	}
	.steps {
		list-style: none;
		margin: 11px 0 0;
		padding: 11px 12px;
		background: var(--panel-2);
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.steps li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	.steps .n {
		flex: none;
		width: 19px;
		height: 19px;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 11px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.steps b {
		font-weight: 700;
		color: var(--text);
	}
	.warn {
		margin-top: 9px;
		font-size: 12px;
		color: var(--muted-2);
		line-height: 1.6;
		word-break: keep-all;
	}
</style>
