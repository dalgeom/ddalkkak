<script lang="ts">
	import { dev } from '$app/environment';

	let { label }: { label: string } = $props();
</script>

<!--
	애드센스 승인 전까지 프로덕션에서는 아무것도 렌더링하지 않는다.
	점선 placeholder가 라이브에 노출되면 미완성 템플릿처럼 보인다.
	승인 후 실제 광고 유닛으로 교체하면서 dev 조건을 제거:
	<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
	     data-ad-slot="슬롯ID" data-ad-format="auto" data-full-width-responsive="true"></ins>
	<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
-->
{#if dev}
	<div class="ad-slot">광고 자리 — {label} (개발 중에만 보임)</div>
{/if}

<style>
	.ad-slot {
		border: 1px dashed var(--border);
		border-radius: 12px;
		color: #4d5b73;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		min-height: 90px;
		margin: 18px 0 0;
	}
</style>
