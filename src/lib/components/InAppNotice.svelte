<script lang="ts">
	import { onMount } from 'svelte';
	import { detectInApp, openWay, externalUrl, APP_LABEL, type InApp, type OpenWay } from '$lib/inapp';

	/**
	 * 인앱 브라우저에서 열렸을 때 기본 브라우저로 넘기도록 안내한다.
	 * 인앱 WebView는 저장소가 분리돼 있어 여기서 풀면 기록이 갇히고 앱이 비우면 사라진다.
	 */
	const KEY = 'ddal.inapp.hide';

	let app = $state<InApp>(null);
	let way = $state<OpenWay>('manual');
	let href = $state('');
	let hidden = $state(true);

	onMount(() => {
		const ua = navigator.userAgent;
		const found = detectInApp(ua);
		if (!found) return;
		try {
			if (sessionStorage.getItem(KEY)) return;
		} catch {
			/* 저장소가 막혀 있으면 그냥 보여준다 */
		}
		app = found;
		way = openWay(found, ua);
		href = location.href;
		hidden = false;
	});

	function dismiss() {
		hidden = true;
		try {
			sessionStorage.setItem(KEY, '1');
		} catch {
			/* 무시 */
		}
	}

	let url = $derived(app ? externalUrl(way, href) : null);
</script>

{#if !hidden && app}
	<aside class="notice" role="note">
		<div class="txt">
			<b>{APP_LABEL[app]} 안에서 열렸어요</b>
			<span>
				여기서 풀면 기록과 연속 일수가 이 앱에만 저장되고, 앱이 데이터를 비우면 사라져요.
			</span>
		</div>
		<div class="act">
			{#if url}
				<a class="btn" href={url}>기본 브라우저로 열기</a>
			{:else}
				<span class="how">우측 하단 <b>⋯</b> → <b>기본 브라우저로 열기</b></span>
			{/if}
			<button class="x" onclick={dismiss} aria-label="안내 닫기">✕</button>
		</div>
	</aside>
{/if}

<style>
	.notice {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		background: var(--gold-bg);
		border: 1px solid var(--gold);
		border-radius: 14px;
		padding: 13px 14px;
		margin-bottom: 18px;
	}
	.txt {
		flex: 1 1 220px;
		min-width: 0;
	}
	.txt b {
		display: block;
		font-size: 13.5px;
		font-weight: 800;
		color: var(--gold-text);
		margin-bottom: 3px;
	}
	.txt span {
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--gold-text);
		opacity: 0.9;
		word-break: keep-all;
	}
	.act {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: none;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		min-height: 38px;
		padding: 0 14px;
		border-radius: 10px;
		background: var(--gold-text);
		color: #fff;
		font-size: 13px;
		font-weight: 800;
		text-decoration: none;
		white-space: nowrap;
	}
	.how {
		font-size: 12px;
		font-weight: 700;
		color: var(--gold-text);
		word-break: keep-all;
	}
	.x {
		flex: none;
		width: 30px;
		height: 30px;
		border-radius: 9px;
		border: 1px solid var(--gold);
		background: transparent;
		color: var(--gold-text);
		font-size: 12px;
		font-weight: 800;
		cursor: pointer;
		font-family: inherit;
	}
</style>
