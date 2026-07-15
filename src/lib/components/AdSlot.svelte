<script lang="ts">
	let { label }: { label: string } = $props();
</script>

<!--
	애드센스 승인 후 이 placeholder를 실제 광고 유닛으로 교체:
	<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
	     data-ad-slot="슬롯ID" data-ad-format="auto" data-full-width-responsive="true"></ins>
	<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
-->
<div class="ad-slot">광고 영역 — {label}</div>

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
