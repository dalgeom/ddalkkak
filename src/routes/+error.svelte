<script lang="ts">
	import { page } from '$app/state';

	let is404 = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{page.status} — 딸깍</title>
</svelte:head>

<div class="err">
	<div class="code">{page.status}</div>
	<h1>{is404 ? '여기엔 아직 아무것도 없어요' : '문제가 생겼어요'}</h1>
	<p>
		{is404
			? '찾는 페이지가 없거나, 아직 열리지 않은 날짜예요. 오늘의 딸깍은 매일 자정에 새로 열립니다.'
			: '잠시 후 다시 시도해 주세요. 계속 그러면 새로고침해 보세요.'}
	</p>
	<div class="cta-row">
		<a class="cta" href="/">오늘의 딸깍 풀러 가기 →</a>
		{#if is404}
			<a class="cta ghost" href="/archive">지난 문제 보기</a>
		{/if}
	</div>
</div>

<style>
	.err {
		max-width: 520px;
		margin: 40px auto;
		text-align: center;
		padding: 40px 24px;
	}
	.code {
		font-size: clamp(56px, 18vw, 96px);
		font-weight: var(--fw-number);
		font-variant-numeric: tabular-nums;
		color: var(--accent);
		letter-spacing: var(--ls-tight);
		line-height: 1;
	}
	h1 {
		margin-top: 12px;
		font-size: var(--fs-xl);
		font-weight: var(--fw-emphasis);
		word-break: keep-all;
	}
	p {
		margin-top: 12px;
		font-size: var(--fs-sm);
		font-weight: var(--fw-caption);
		line-height: var(--lh-reading);
		color: var(--muted);
		word-break: keep-all;
	}
	.cta-row {
		margin-top: 24px;
		display: flex;
		gap: 10px;
		justify-content: center;
		flex-wrap: wrap;
	}
	.cta {
		display: inline-block;
		padding: 13px 22px;
		border-radius: 13px;
		background: var(--accent);
		color: #fff;
		font-size: var(--fs-sm);
		font-weight: var(--fw-emphasis);
		text-decoration: none;
		box-shadow: 0 1px 2px rgba(44, 40, 34, 0.16);
		transition:
			filter 0.18s var(--ease-out),
			transform var(--dur-tap) var(--ease-out);
	}
	.cta.ghost {
		background: var(--panel-2);
		color: var(--text);
		border: 1.5px solid var(--border-strong);
	}
	.cta:hover {
		filter: brightness(1.06);
		transform: translateY(-1.5px);
	}
</style>
