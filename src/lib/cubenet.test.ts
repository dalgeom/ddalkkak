import { describe, it, expect } from 'vitest';
import {
	parseNet,
	foldNet,
	allRotations,
	achievableViews,
	oppositePairs,
	viewOf,
	NETS,
	FACES,
	makeProblem,
	problemAt
} from './cubenet';

describe('접기 수학', () => {
	it('십자 전개도는 접힌다', () => {
		const cube = foldNet(parseNet(['.#..', '####', '.#..']));
		expect(cube).not.toBeNull();
		const vals = [cube!.u, cube!.d, cube!.n, cube!.s, cube!.e, cube!.w];
		expect(new Set(vals).size).toBe(6);
	});

	it('한 줄로 늘어선 6칸은 접히지 않는다', () => {
		expect(foldNet(parseNet(['######']))).toBeNull();
	});

	it('2x3 직사각형은 접히지 않는다 (겹친다)', () => {
		expect(foldNet(parseNet(['###', '###']))).toBeNull();
	});

	it('칸이 6개가 아니면 접히지 않는다', () => {
		expect(foldNet(parseNet(['#####']))).toBeNull();
		expect(foldNet(parseNet(['#######']))).toBeNull();
	});

	it('만들어낸 전개도가 모두 실제로 접힌다', () => {
		// 여섯 칸 조각 216가지를 전부 훑어 접히는 것만 남긴 결과 — 숫자가 바뀌면 생성기가 바뀐 것이다
		expect(NETS.length).toBe(64);
		for (const n of NETS) {
			expect(foldNet(n.cells), n.rows.join('/')).not.toBeNull();
		}
	});

	it('전개도 목록에 중복이 없다', () => {
		const keys = NETS.map((n) => n.rows.join('/'));
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('주사위를 돌리는 방법은 정확히 24가지다', () => {
		for (const n of NETS) {
			expect(allRotations(n.cube).length, n.rows.join('/')).toBe(24);
		}
	});

	it('돌려도 마주 보는 짝은 그대로다', () => {
		for (const n of NETS) {
			const want = oppositePairs(n.cube)
				.map((p) => p.slice().sort().join('-'))
				.sort()
				.join(' ');
			for (const r of allRotations(n.cube)) {
				const got = oppositePairs(r)
					.map((p) => p.slice().sort().join('-'))
					.sort()
					.join(' ');
				expect(got, n.rows.join('/')).toBe(want);
			}
		}
	});

	it('마주 보는 면은 한 화면에 같이 안 보인다', () => {
		for (const n of NETS) {
			const opp = new Map<number, number>();
			for (const [a, b] of oppositePairs(n.cube)) {
				opp.set(a, b);
				opp.set(b, a);
			}
			for (const r of allRotations(n.cube)) {
				const [a, b, c] = viewOf(r);
				expect(opp.get(a)).not.toBe(b);
				expect(opp.get(a)).not.toBe(c);
				expect(opp.get(b)).not.toBe(c);
			}
		}
	});

	/**
	 * 손으로 접어서 확인한 기준점. 위 검사들은 전부 '내부 일관성'만 보기 때문에
	 * 주사위 전체가 거울로 뒤집혀 있어도 통과한다(실제로 처음엔 뒤집혀 있었다).
	 * 이 검사만이 실제 종이와 맞는지를 본다.
	 *
	 *   . E . .        그림이 그려진 면이 바깥으로 오도록 아래쪽으로 접으면
	 *   A B C D        B가 윗면, D가 바닥, A가 서쪽, C가 동쪽, E가 북쪽, F가 남쪽.
	 *   . F . .        따라서 (윗면 B, 왼쪽=남 F, 오른쪽=동 C)를 만들 수 있어야 한다.
	 */
	it('손으로 접은 결과와 일치한다 — 거울로 뒤집히지 않았는가', () => {
		const cells = parseNet(['.#..', '####', '.#..']);
		// 읽는 순서: 0=E, 1=A, 2=B, 3=C, 4=D, 5=F
		const cube = foldNet(cells)!;
		expect(cube).not.toBeNull();

		const opp = new Map<number, number>();
		for (const [a, b] of oppositePairs(cube)) {
			opp.set(a, b);
			opp.set(b, a);
		}
		expect(opp.get(2)).toBe(4); // B ↔ D
		expect(opp.get(1)).toBe(3); // A ↔ C
		expect(opp.get(0)).toBe(5); // E ↔ F

		const ok = achievableViews(cube);
		expect(ok.has('2,5,3')).toBe(true); // 윗면 B, 왼쪽 F, 오른쪽 C
		expect(ok.has('2,3,5')).toBe(false); // 그 거울상은 나오면 안 된다
	});

	it('거울상은 어떻게 돌려도 안 나온다', () => {
		for (const n of NETS) {
			const ok = achievableViews(n.cube);
			for (const r of allRotations(n.cube)) {
				const [a, b, c] = viewOf(r);
				expect(ok.has([a, c, b].join(',')), `${n.rows.join('/')} ${a},${b},${c}`).toBe(false);
			}
		}
	});
});

describe('문제 생성', () => {
	const SAMPLE = Array.from({ length: 300 }, (_, i) => problemAt(i));

	it('300문제를 전부 만들어낸다', () => {
		expect(SAMPLE.length).toBe(300);
	});

	it('보기는 4개, 정답은 그중 하나다', () => {
		for (const p of SAMPLE) {
			expect(p.options.length).toBe(4);
			expect(p.answer).toBeGreaterThanOrEqual(0);
			expect(p.answer).toBeLessThan(4);
		}
	});

	it('보기 4개가 서로 다르다', () => {
		for (const p of SAMPLE) {
			const keys = p.options.map((o) => o.join(','));
			expect(new Set(keys).size).toBe(4);
		}
	});

	it('한 보기 안에 같은 기호가 두 번 나오지 않는다', () => {
		for (const p of SAMPLE) {
			for (const o of p.options) expect(new Set(o).size).toBe(3);
		}
	});

	it('만들 수 있는 보기는 정확히 하나다 — 24가지 회전 전수 대조', () => {
		for (const p of SAMPLE) {
			const cube = foldNet(p.net.cells)!;
			const sym = (i: number) => p.net.faceOf[i];
			const ok = new Set(allRotations(cube).map((c) => viewOf(c).map(sym).join(',')));
			const possible = p.options.filter((o) => ok.has(o.join(',')));
			expect(possible.length).toBe(1);
			expect(possible[0].join(',')).toBe(p.options[p.answer].join(','));
		}
	});

	it('여섯 면에 서로 다른 기호가 하나씩 들어간다', () => {
		for (const p of SAMPLE) {
			expect(new Set(p.net.faceOf).size).toBe(6);
			expect(p.net.faceOf.length).toBe(6);
		}
	});

	it('같은 번호는 항상 같은 문제 (매일 모두가 같은 문제를 푼다)', () => {
		for (const i of [0, 7, 42, 199]) {
			expect(JSON.stringify(problemAt(i))).toBe(JSON.stringify(problemAt(i)));
		}
	});

	it('연속된 문제가 서로 다르다', () => {
		const keys = SAMPLE.slice(0, 100).map((p) => JSON.stringify(p));
		expect(new Set(keys).size).toBeGreaterThan(90);
	});

	it('정답 위치가 한쪽에 몰리지 않는다', () => {
		const count = [0, 0, 0, 0];
		for (const p of SAMPLE) count[p.answer]++;
		// 300문제면 자리당 75개가 기대값 — 절반 아래로 쏠리면 편향이다
		for (const n of count) expect(n).toBeGreaterThan(40);
	});

	it('전개도 종류가 골고루 쓰인다', () => {
		const used = new Set(SAMPLE.map((p) => p.net.rows.join('/')));
		expect(used.size).toBeGreaterThanOrEqual(Math.min(15, NETS.length));
	});
});

describe('면 기호', () => {
	it('여섯 개이고 색과 모양이 모두 다르다', () => {
		expect(FACES.length).toBe(6);
		expect(new Set(FACES.map((f) => f.color)).size).toBe(6);
		expect(new Set(FACES.map((f) => f.shape)).size).toBe(6);
	});
});

describe('makeProblem', () => {
	it('만들지 못하면 예외 대신 null을 준다', () => {
		// 어떤 씨앗이든 예외로 터지지는 않아야 한다
		for (let s = 0; s < 500; s++) {
			expect(() => makeProblem(s)).not.toThrow();
		}
	});
});

/**
 * /cubenet/guide 가 가르치는 요령들. 어림짐작을 요령이라고 쓰면 안 되므로
 * 전개도 64종 전부에서 반례가 없는지 확인한다.
 */
describe('전개도 읽는 요령', () => {
	const key = (r: number, c: number) => `${r},${c}`;
	const each = (fn: (net: (typeof NETS)[number], at: Map<string, number>, opp: Map<number, number>) => void) => {
		for (const n of NETS) {
			const at = new Map(n.cells.map((x, i) => [key(x.r, x.c), i]));
			const opp = new Map<number, number>();
			for (const [a, b] of oppositePairs(n.cube)) {
				opp.set(a, b);
				opp.set(b, a);
			}
			fn(n, at, opp);
		}
	};

	it('일직선으로 한 칸 건너뛴 두 칸은 마주 본다', () => {
		let n = 0;
		each((net, at, opp) => {
			for (const { r, c } of net.cells)
				for (const [dr, dc] of [
					[0, 1],
					[1, 0]
				]) {
					const mid = at.get(key(r + dr, c + dc));
					const far = at.get(key(r + dr * 2, c + dc * 2));
					if (mid === undefined || far === undefined) continue;
					n++;
					expect(opp.get(at.get(key(r, c))!), net.rows.join('/')).toBe(far);
				}
		});
		expect(n).toBeGreaterThan(100); // 검사가 헛돌지 않았는지
	});

	it('ㄱ자로 꺾인 두 칸은 이웃이다 (마주 보지 않는다)', () => {
		let n = 0;
		each((net, at, opp) => {
			for (const { r, c } of net.cells)
				for (const [dr, dc] of [
					[1, 1],
					[1, -1]
				]) {
					const other = at.get(key(r + dr, c + dc));
					if (other === undefined) continue;
					const bridge =
						at.get(key(r, c + dc)) !== undefined || at.get(key(r + dr, c)) !== undefined;
					if (!bridge) continue;
					n++;
					expect(opp.get(at.get(key(r, c))!), net.rows.join('/')).not.toBe(other);
				}
		});
		expect(n).toBeGreaterThan(150);
	});

	it('네 칸이 일직선이면 양 끝은 마주 보는 게 아니라 이웃이다 (상자를 감는 띠)', () => {
		let n = 0;
		each((net, at, opp) => {
			for (const { r, c } of net.cells)
				for (const [dr, dc] of [
					[0, 1],
					[1, 0]
				]) {
					const all = [1, 2, 3].every((k) => at.get(key(r + dr * k, c + dc * k)) !== undefined);
					if (!all) continue;
					n++;
					expect(opp.get(at.get(key(r, c))!), net.rows.join('/')).not.toBe(
						at.get(key(r + dr * 3, c + dc * 3))
					);
				}
		});
		expect(n).toBeGreaterThan(20);
	});
});
