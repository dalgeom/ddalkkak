<script lang="ts">
	/**
	 * 「어떻게 풀까요?」 놀이 방법 타일(v2, 2026-10-14). 유형 홈마다 같은 자리, 같은 모양으로 둔다.
	 * /matchstick이 먼저 이 모양을 썼고(타임어택·개수 도전처럼 펼치는 타일이 있어 그 화면은 직접 그린다),
	 * 나머지 유형 홈은 이 컴포넌트를 쓴다. 스타일은 styles/v2.css의 .modes · .mode.
	 */
	type Mode = { name: string; sub: string; href?: string; onclick?: () => void; main?: boolean };
	let { title = '어떻게 풀까요?', modes }: { title?: string; modes: Mode[] } = $props();
</script>

<section class="sec">
	<h2 class="mt">{title}</h2>
	<div class="modes">
		{#each modes as m (m.name)}
			{#if m.href}
				<a class="mode" class:main={m.main} href={m.href}><b>{m.name}</b><span>{m.sub}</span></a>
			{:else}
				<button class="mode" class:main={m.main} onclick={m.onclick}><b>{m.name}</b><span>{m.sub}</span></button>
			{/if}
		{/each}
	</div>
</section>

<style>
	.mt {
		font-size: 17px;
		font-weight: 800;
	}
</style>
