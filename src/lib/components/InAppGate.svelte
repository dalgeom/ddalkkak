<script lang="ts">
	import { onMount } from 'svelte';
	import {
		detectInApp,
		openWay,
		externalUrl,
		manualSteps,
		APP_LABEL,
		type InApp,
		type OpenWay
	} from '$lib/inapp';
	import { track } from '$lib/analytics';

	/**
	 * 카카오톡 등에서 열렸을 때 화면 전체를 덮고 기본 브라우저로 보내는 안내.
	 *
	 * 배너로 만들었더니 닫고 그냥 인앱에서 플레이해 기록이 날아가는 문제가 있었다.
	 * 인앱에서는 푼 기록이 그 앱 안에만 남아서, 다음에 다른 데로 들어오면 사라진 것처럼 보인다.
	 * 그래서 '한 번 더 누르면 되는 안내'가 아니라 '버튼 하나로 나가는 화면'으로 만든다.
	 *
	 * 화면을 덮는 방식이라 크롤러·일반 브라우저에는 아무 영향이 없다(감지 후 클라이언트에서만 붙는다).
	 */
	let app = $state<InApp>(null);
	let way = $state<OpenWay>('manual');
	let href = $state('');
	let skipped = $state(false);

	onMount(() => {
		const ua = navigator.userAgent;
		const found = detectInApp(ua);
		if (!found) return;
		app = found;
		way = openWay(found, ua);
		href = location.href;
		track('inapp_gate', { app: found, way: openWay(found, ua) });
	});

	let url = $derived(app ? externalUrl(way, href) : null);
	let show = $derived(!!app && !skipped);

	// 뒤에 있는 페이지가 스크롤되지 않게 잠근다
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = show ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	function open() {
		track('inapp_open_external', { app: app ?? '' });
	}
	function skip() {
		track('inapp_skip', { app: app ?? '' });
		skipped = true;
	}
</script>

{#if show && app}
	<div class="gate" role="dialog" aria-modal="true" aria-label="기본 브라우저로 열기 안내">
		<div class="inner">
			<div class="brand">
				<span class="bulb" aria-hidden="true"></span>
				<span class="name">딸깍</span>
			</div>

			<h1>{APP_LABEL[app]}에서 열면<br /><b>기록이 남지 않아요</b></h1>
			<p class="lead">
				브라우저로 열어야 매일 푼 기록과 연속 일수가 그대로 쌓여요.
			</p>

			{#if url}
				<!-- href={url} — 여기에 현재 주소(href)를 넣으면 제자리로 돌아와 아무 일도 안 일어난다 -->
				<a class="go" href={url} data-sveltekit-reload onclick={open}>브라우저로 열기</a>
			{:else}
				<ol class="steps">
					{#each manualSteps(app) as s, i (i)}
						<li><span class="n">{i + 1}</span><b>{s}</b></li>
					{/each}
				</ol>
			{/if}

			<button class="skip" onclick={skip}>그냥 여기서 풀래요</button>
		</div>
	</div>
{/if}

<style>
	.gate {
		position: fixed;
		inset: 0;
		z-index: 300;
		background: var(--bg);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 20px;
		overflow-y: auto;
	}
	.inner {
		width: 100%;
		max-width: 360px;
		text-align: center;
	}
	.brand {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		margin-bottom: 28px;
	}
	.bulb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--gold);
		border: 2.5px solid var(--text);
		position: relative;
		flex: none;
	}
	.bulb::after {
		content: '';
		position: absolute;
		bottom: -6px;
		left: 3px;
		width: 7px;
		height: 3px;
		background: var(--text);
	}
	.name {
		font-size: 21px;
		font-weight: 800;
	}
	h1 {
		font-size: 25px;
		font-weight: 800;
		line-height: 1.4;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent);
	}
	.lead {
		margin-top: 14px;
		font-size: 14.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.go {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 58px;
		margin-top: 28px;
		border-radius: 15px;
		background: var(--accent);
		color: #fff;
		font-size: 17px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.go:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 var(--accent-press);
	}
	.steps {
		list-style: none;
		margin: 26px 0 0;
		padding: 16px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 15px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		text-align: left;
	}
	.steps li {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 15px;
	}
	.steps .n {
		flex: none;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 12px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.steps b {
		font-weight: 700;
	}
	/* 버튼이 통하지 않는 기기도 있으니 막다른 길은 만들지 않는다 — 대신 눈에 덜 띄게 */
	.skip {
		margin-top: 18px;
		background: none;
		border: none;
		font-family: inherit;
		font-size: 13px;
		color: var(--muted-2);
		text-decoration: underline;
		cursor: pointer;
		padding: 8px;
	}
</style>
