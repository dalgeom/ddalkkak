<script lang="ts">
	import FaceMark from './FaceMark.svelte';
	import { FACES, type Cell } from '$lib/cubenet';

	/**
	 * 전개도가 실제로 접히는 과정을 보여준다.
	 *
	 * 칸을 부모-자식으로 엮어 붙여 놓고, 맞닿은 모서리를 축으로 90도씩 돌린다.
	 * 종이를 접는 것과 똑같은 동작이라 별도 3D 라이브러리가 필요 없다.
	 *
	 * 접는 방향은 하나뿐이다 — 그림이 바깥으로 오는 쪽. 반대로 접으면 그림이
	 * 상자 안쪽에 갇혀 겉에서는 백지 여섯 장만 보인다.
	 */
	let {
		cells,
		faceOf,
		t = 1,
		rotX = -22,
		rotY = -38,
		size = 50
	}: {
		cells: Cell[];
		faceOf: number[];
		/** 0 = 펼친 상태, 1 = 다 접힌 상태 */
		t?: number;
		rotX?: number;
		rotY?: number;
		size?: number;
	} = $props();

	type Dir = 'e' | 'w' | 's' | 'n';
	type Node = { idx: number; dir: Dir | null; children: Node[] };

	/** 맞닿은 칸끼리 부모-자식으로 엮는다. 뿌리 칸은 제자리에 남고 나머지가 접혀 올라간다. */
	const tree = $derived.by<Node>(() => {
		const at = new Map(cells.map((c, i) => [`${c.r},${c.c}`, i]));
		const seen = new Set<number>([0]);
		const build = (idx: number, dir: Dir | null): Node => {
			const { r, c } = cells[idx];
			const node: Node = { idx, dir, children: [] };
			const moves: [string, Dir][] = [
				[`${r},${c + 1}`, 'e'],
				[`${r},${c - 1}`, 'w'],
				[`${r + 1},${c}`, 's'],
				[`${r - 1},${c}`, 'n']
			];
			for (const [key, d] of moves) {
				const ni = at.get(key);
				if (ni === undefined || seen.has(ni)) continue;
				seen.add(ni);
				node.children.push(build(ni, d));
			}
			return node;
		};
		return build(0, null);
	});

	const ORIGIN: Record<Dir, string> = {
		e: '0% 50%',
		w: '100% 50%',
		s: '50% 0%',
		n: '50% 100%'
	};
	const OFFSET: Record<Dir, string> = {
		e: 'left:100%;top:0;',
		w: 'left:-100%;top:0;',
		s: 'left:0;top:100%;',
		n: 'left:0;top:-100%;'
	};
	/** 그림이 바깥으로 오려면 화면 안쪽(-Z)으로 접어야 한다. */
	function hinge(dir: Dir, deg: number): string {
		if (dir === 'e') return `rotateY(${deg}deg)`;
		if (dir === 'w') return `rotateY(${-deg}deg)`;
		if (dir === 's') return `rotateX(${-deg}deg)`;
		return `rotateX(${deg}deg)`;
	}

	const deg = $derived(90 * Math.max(0, Math.min(1, t)));

	/**
	 * 뿌리 칸이 제자리에 남으므로 그냥 두면 큐브가 한쪽으로 쏠린다.
	 * 펼쳤을 땐 전개도 전체를, 접었을 땐 뿌리 칸(=큐브)을 가운데 두도록 t에 따라 옮긴다.
	 */
	const shift = $derived.by(() => {
		const rs = cells.map((c) => c.r);
		const cs = cells.map((c) => c.c);
		const netR = (Math.min(...rs) + Math.max(...rs) + 1) / 2;
		const netC = (Math.min(...cs) + Math.max(...cs) + 1) / 2;
		const dx = -(netC - (cells[0].c + 0.5)) * size;
		const dy = -(netR - (cells[0].r + 0.5)) * size;
		return { dx: dx * (1 - t), dy: dy * (1 - t) };
	});
</script>

{#snippet faceNode(node: Node)}
	<div
		class="face"
		data-face={faceOf[node.idx]}
		style="width:{size}px;height:{size}px;{node.dir ? OFFSET[node.dir] : ''}{node.dir
			? `transform-origin:${ORIGIN[node.dir]};transform:${hinge(node.dir, deg)};`
			: ''}"
	>
		<svg viewBox="0 0 1 1" width={size} height={size} aria-hidden="true">
			<FaceMark face={faceOf[node.idx]} />
		</svg>
		{#each node.children as child (child.idx)}
			{@render faceNode(child)}
		{/each}
	</div>
{/snippet}

<div class="scene" style="height:{size * 4.4}px;">
	<div class="shift" style="transform:translate({shift.dx}px,{shift.dy}px);">
		<div
			class="pivot"
			style="width:{size}px;height:{size}px;transform:rotateX({rotX}deg) rotateY({rotY}deg);"
		>
			{@render faceNode(tree)}
		</div>
	</div>
</div>

<style>
	.scene {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		perspective: 1100px;
		overflow: hidden;
	}
	.shift {
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.6s ease;
	}
	.pivot {
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.35s ease;
	}
	.face {
		position: absolute;
		transform-style: preserve-3d;
		background: var(--panel);
		border: 1.5px solid var(--border-strong);
		box-sizing: border-box;
		transition: transform 0.6s ease;
	}
	.face svg {
		display: block;
		backface-visibility: hidden;
	}
</style>
