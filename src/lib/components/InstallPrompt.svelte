<script lang="ts">
	import { onMount } from 'svelte';
	import { installEvent, isStandalone, isIOSInstallable } from '$lib/pwa';
	import { track } from '$lib/analytics';

	/**
	 * 홈 화면 추가 권유. 처음 들어온 사람에게 들이대면 방해만 되므로
	 * 10문제를 끝낸 직후(기록이 막 생긴 순간)에만 보여준다.
	 */
	const KEY = 'ddal.install.hide';

	let mode = $state<'none' | 'button' | 'ios'>('none');
	let hidden = $state(true);

	onMount(() => {
		if (isStandalone()) return;
		try {
			if (localStorage.getItem(KEY)) return;
		} catch {
			/* 저장소가 막혀 있으면 그냥 보여준다 */
		}
		hidden = false;
		if (isIOSInstallable(navigator.userAgent)) mode = 'ios';
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
			<b>내일도 여기서 이어서</b>
			<button class="x" onclick={dismiss} aria-label="닫기">✕</button>
		</div>
		<p class="d">
			홈 화면에 추가하면 앱처럼 바로 열려요. 브라우저를 옮겨 다니지 않아서 연속 기록도 한곳에
			쌓입니다.
		</p>
		{#if mode === 'button'}
			<button class="go" onclick={install}>홈 화면에 추가</button>
		{:else}
			<p class="how">
				아래 <b>공유 버튼</b>을 누르고 <b>홈 화면에 추가</b>를 선택하세요.
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
	.how {
		margin-top: 10px;
		padding: 10px 12px;
		background: var(--panel-2);
		border-radius: 10px;
		font-size: 12.5px;
		color: var(--muted);
		line-height: 1.6;
		word-break: keep-all;
	}
	.how b {
		color: var(--text);
	}
</style>
